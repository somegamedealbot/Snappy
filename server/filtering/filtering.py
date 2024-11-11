from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, session
from schemas import User, Video, Like
import numpy as np
import math

engine = create_engine('sqlite:///../../main.db')

session = sessionmaker(bind=engine)()

def get_latest_data():
    # table_names_from_session = session.get_bind().metadata.tables.keys()
    inspector = inspect(engine)
    print(inspector.get_table_names())
    users = session.query(User).all()
    videos = session.query(Video).all()
    likes = session.query(Like).all()

    user_ids = {user.userId: idx for idx, user in enumerate(users)}
    video_ids = {video.id: idx for idx, video in enumerate(videos)}

    matrix = np.zeros((len(users), len(videos)))

    for like in likes:
        user_idx = user_ids[like.user_id]
        video_idx = video_ids[like.video_id]
        # Assign 1 for like, -1 for dislike
        matrix[user_idx, video_idx] = 1 if like.like_value else -1

    return matrix, user_ids, video_ids

def compute_similarity(matrix):
    
    # normalize vectors in matrix
    norm_matrix = matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-9)

    # compute similarity
    similarity = np.dot(norm_matrix, norm_matrix.T)

    return similarity

def recommend_videos(user_id, num_vids):
    
    matrix, user_ids, video_ids = get_latest_data()
    
    sim_matrix = compute_similarity(matrix)
    # get mapping of user id
    user_map_id = user_ids[user_id]
   
    sim_users = sim_matrix[user_map_id]
    sim_users[user_map_id] = 0 

    weighted_scores = np.dot(sim_users, matrix)

    user_interactions = matrix[user_map_id]
    unviewed_video_ids = np.where(user_interactions == 0)[0]

    # make sure that the view the recommendations have not been viewed yet
    # prefer:
    # 1. Recommended videos that have not been viewed
    # 2. random videos (not been viewed before)
    # 3. just random videos if eveything has been viewed
    print(len(unviewed_video_ids))

    recommended_idxs = unviewed_video_ids[np.argsort(-weighted_scores[unviewed_video_ids])]
    video_ids_reverse = {v: k for k, v in video_ids.items()}
    return [video_ids_reverse[idx] for idx in recommended_idxs[:num_vids]]

print(recommend_videos('019317fc-f35a-7aad-bf97-d2dfbcb272fd', num_vids=5))
