from sqlalchemy import create_engine, Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'Users'
    userId = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)

    # videos = relationship('Videos', back_populates='author')
    # likes = relationship('UserVideoLike', back_populates='user_id')

class Video(Base):
    __tablename__ = 'Videos'
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    author_id = Column(String, ForeignKey('users.userId'), nullable=False)
    likes = Column(Integer, default=0)
    views = Column(Integer, default=0)
    description = Column(String, nullable=False)

    # author = relationship('User', back_populates='id')
    # video_likes = relationship('Like', back_populates='video_id')

class Like(Base):
    __tablename__ = 'UserVideoLikes'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, ForeignKey('users.userId'))
    video_id = Column(String, ForeignKey('videos.id'))
    like_value = Column(Boolean, nullable=False)  # True for like, False for dislike

    # user = relationship('User', back_populates='userId')
    # video = relationship('Video', back_populates='id')