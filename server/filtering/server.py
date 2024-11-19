from flask import Flask, request, jsonify
from filtering import recommend_videos, similar_videos

app = Flask(__name__)

# redis tracking all videos already passed

@app.route('/test', methods=['GET'])
def test():
    return 'TEST'

@app.route('/', methods=['POST'])
def recommend():
    count = int(request.form.get('count'))
    video_id = request.form.get('videoId')
    if video_id:
        # find similar videos given the video_id
        ids = similar_videos(video_id, count)
    else:
        user_id = request.form.get('id')
        # get recommended videos from api
        ids = recommend_videos(user_id, count)
    
    return jsonify(ids)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)