from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, session
from schemas import User, Video, Like
import numpy as np

engine = create_engine('sqlite:////root/cse-356-warmup-project-2/main.db')

session = sessionmaker(bind=engine)()

def get_latest_data():
    # table_names_from_session = session.get_bind().metadata.tables.keys()
    inspector = inspect(engine)
    # print(inspector.get_table_names())
    users = session.query(User).all()
    videos = session.query(Video).all()
    likes = session.query(Like).all()

    user_ids = {user.userId: idx for idx, user in enumerate(users)}
    video_ids = {video.id: idx for idx, video in enumerate(videos)}

    matrix = np.zeros((len(users), len(videos)))

    for like in likes:
        print(like.like_value, like.user_id, like.video_id)
        user_idx = user_ids[like.user_id]
        video_idx = video_ids[like.video_id]
        # Assign 1 for like, -1 for dislike
        matrix[user_idx, video_idx] = 1 if like.like_value else -1

    return matrix, user_ids, video_ids

def compute_similarity(matrix, user_vector):
    
    # normalize vectors in matrix: self divide by norm
    norm_user_vector = np.linalg.norm(user_vector, keepdims=True)

    # (users, 1)
    norm_matrix = (np.linalg.norm(matrix, axis=1, keepdims=True))

    # (1, users)
    similarity = np.zeros(np.shape(norm_matrix)[0])

    for i, norm_row in enumerate(norm_matrix):
        if norm_user_vector * norm_row != 0:

            similarity[i] += user_vector.dot(matrix[i]) # ????
            similarity[i] /= (norm_user_vector * norm_row)

    # compute similarity

    print(similarity)
    print(np.shape(similarity))

    return similarity

def recommend_videos(user_id, num_vids):
    
    # mappings of user ids and video ids
    matrix, user_ids, video_ids = get_latest_data()
    user_map_id = user_ids[user_id]
    user_vector = matrix[user_map_id]
    sim_to_others = compute_similarity(matrix, user_vector)
    # print(sim_to_others)
    # get mapping of user id
   
    # sim_users = sim_matrix[user_map_id]

    # removes self to not compare with self
    sim_to_others[user_map_id] = 0 
    # # print(sim_to_others)
    # print(np.shape(sim_to_others), np.shape(matrix))

    # # similarity scores
    weighted_scores = sim_to_others @ matrix
    # # np.set_printoptions(threshold=sys.maxsize)
    # # print(weighted_scores)
    user_interactions = matrix[user_map_id]
    # # videos that were not liked/disliked
    # edit this to get actual videos where the user has not viewed
    # viewed_videos = 
    # unviewed_video_ids = np.where(it is not in the set of viewed videos)[0]
    unviewed_video_ids = np.where(user_interactions == 0)[0]

    # # make sure that the view the recommendations have not been viewed yet
    # # prefer:
    # # 1. Recommended videos that have not been viewed
    # # 2. random videos (not been viewed before)
    # # 3. just random videos if eveything has been viewed

    # # print(len(unviewed_video_ids))
    # # print(weighted_scores[unviewed_video_ids])
    recommended_idxs = unviewed_video_ids[np.argsort(-weighted_scores[unviewed_video_ids])]
    # # print(recommended_idxs)
    video_ids_reverse = {v: k for k, v in video_ids.items()}
    return [video_ids_reverse[idx] for idx in recommended_idxs[:num_vids]]

print(recommend_videos('01931ce1-44ce-7aa8-ba5b-38cbae330fcc', num_vids=5))
