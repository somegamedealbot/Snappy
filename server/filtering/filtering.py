from sqlalchemy import create_engine, inspect, select, func
from sqlalchemy.orm import sessionmaker, session
from schemas import User, Video, Like, View
import numpy as np
import time

# use redis tracking all videos already passed
# keep track of the last 10 videos recommended to each user and don't reuse them

previously_recommended = {}

engine = create_engine('sqlite:////root/cse-356-warmup-project-2/main.db')

session = sessionmaker(bind=engine)()

def get_latest_data(user_id):

    users = session.query(User).all()
    videos = session.query(Video).all()
    likes = session.query(Like).all()
    viewed_vids = session.execute(select(View.video_id).where(View.user_id == user_id))

    viewed = set()
    for vid in viewed_vids:
        viewed.add(vid[0])

    user_ids = {user.userId: idx for idx, user in enumerate(users)}
    video_ids = {video.id: idx for idx, video in enumerate(videos)}

    matrix = np.zeros((len(users), len(videos)))

    for like in likes:
        # print(like.like_value, like.user_id, like.video_id)
        user_idx = user_ids[like.user_id]
        video_idx = video_ids[like.video_id]
        # Assign 1 for like, -1 for dislike
        matrix[user_idx, video_idx] = 1 if like.like_value else -1

    return matrix, user_ids, video_ids, viewed

def compute_similarity(matrix, user_vector):
    
    # normalize vectors in matrix: self divide by norm
    norm_user_vector = np.linalg.norm(user_vector, keepdims=True)

    # (users, 1)
    norm_matrix = (np.linalg.norm(matrix, axis=1, keepdims=True))

    # (1, users)
    similarity = np.zeros(np.shape(norm_matrix)[0])

    for i, norm_row in enumerate(norm_matrix):
        if norm_user_vector * norm_row != 0:

            similarity[i] += np.sum(user_vector.dot(matrix[i])) # ????
            similarity[i] /= np.sum(norm_user_vector * norm_row)

    return similarity

def recommend_videos(user_id, num_vids):

    # user does not have any videos    
    if previously_recommended.get(user_id) == None:
        prev_recs = set()
    else:
        prev_recs = previously_recommended[user_id]

    new_recs = set()

    # mappings of user ids and video ids
    matrix, user_ids, video_ids, viewed = get_latest_data(user_id)
    user_map_id = user_ids[user_id]
    user_vector = matrix[user_map_id]
    sim_to_others = compute_similarity(matrix, user_vector)
    # print(sim_to_others)
    # get mapping of user id
   
    # sim_users = sim_matrix[user_map_id]

    # removes self to not compare with self
    sim_to_others[user_map_id] = 0 
    
    # # similarity scores
    weighted_scores = sim_to_others @ matrix
    user_interactions = matrix[user_map_id]

    # # videos that were not liked/disliked
    unviewed_video_ids = np.where(user_interactions == 0)[0]

    # # make sure that the view the recommendations have not been viewed yet
    # # prefer:
    # # 1. Recommended videos that have not been viewed
    # # 2. random videos (not been viewed before)
    # # 3. just random videos if eveything has been viewed

    recommended_idxs = unviewed_video_ids[np.argsort(-weighted_scores[unviewed_video_ids])]
    video_ids_reverse = {v: k for k, v in video_ids.items()}

    recommended = []
    r_i = 0
    # i = 0

    # add recommended videos
    while len(recommended) < num_vids:
        if r_i >= len(recommended_idxs):
            break

        idx = recommended_idxs[r_i]

        rec_id = video_ids_reverse[idx]

        # add to list if
        # not viewed or previous recommended
        if rec_id not in viewed and rec_id not in prev_recs:
            recommended.append(rec_id)
            new_recs.add(rec_id)
        r_i += 1

    # find views not viewed yet

    if len(recommended) < num_vids:

        unviewed_videos = session.query(Video.id).filter(~Video.id.in_(viewed)).all()
        unviewed_i = 0
        # add random videos not viewed yet
        while len(recommended) < num_vids:
            
            # not enough unviewed videos
            if unviewed_i >= len(unviewed_videos):
                break
            
            # not in previously recommended
            if unviewed_videos[unviewed_i] not in prev_recs: 
                recommended.append(unviewed_videos[unviewed_i][0])
                new_recs.add(unviewed_videos[unviewed_i][0])

    # if still not enough videos, use randomly viewed videos
    if len(recommended) < num_vids:
        random_videos = (
            session.query(Video.id)
            .order_by(func.random())
            .group_by(Video.id)
            .limit(num_vids - len(recommended))
            .all()
        )

        for vid in random_videos:
            recommended.append(vid[0])
            new_recs.add(vid[0])

    # if set is <= 5 keep the set
    if len(prev_recs) + len(recommended) < 6:
        previously_recommended[user_id] = prev_recs.union(new_recs)
    # other wise new recommended set is added for that user
    else:
        previously_recommended[user_id] = new_recs

    if len(recommended) > num_vids:
        raise Exception('Too many videos ', + len(recommended))

    return recommended

# print(recommend_videos('01931e95-77fa-7009-8e88-1e4a09b1bc72', num_vids=5))
