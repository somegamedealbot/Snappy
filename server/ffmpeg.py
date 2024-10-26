import os
import subprocess

# Specify the input directory
input_dir = './videos'
# Create the FFmpeg command template
ffmpeg_command_template = (
    "ffmpeg -i {input_file} "
    "-map 0:v -b:v:0 254k -s:v:0 320x180 "
    "-map 0:v -b:v:1 507k -s:v:1 320x180 "
    "-map 0:v -b:v:2 759k -s:v:2 480x270 "
    "-map 0:v -b:v:3 1013k -s:v:3 640x360 "
    "-map 0:v -b:v:4 1254k -s:v:4 640x360 "
    "-map 0:v -b:v:5 1883k -s:v:5 768x432 "
    "-map 0:v -b:v:6 3134k -s:v:6 1024x576 "
    "-map 0:v -b:v:7 4952k -s:v:7 1280x720 "
    "-adaptation_sets 'id=0,streams=v' "
    "-init_seg_name '{segments_dir}/{video_name}-init_$RepresentationID$.m4s' "
    "-media_seg_name '{segments_dir}/{video_name}-chunk_$Bandwidth$_$Number$.m4s' "
    "-use_template 1 -use_timeline 1 "
    "-f dash {output_file}"
)

ffmpeg_thumbnail_command = (
    "ffmpeg -i {input_file} "
    "-vf \"thumbnail,scale=320:240\" " 
    "-frames:v 1 {output_file} "
)

# Function to extract the ID from the filename
def extract_id(filename):
    # Split the filename by dashes, and take the first part as the ID
    return filename.split('-')[0]

# Loop through all video files in the input directory
for filename in os.listdir(input_dir):
    if filename.endswith(".mp4"):  # Ensure it's a video file
        input_file = os.path.join(input_dir, filename)
        video_name = filename.split('.')[0]

        # Extract ID from the filename
        video_id = extract_id(filename)
        
        # Create output directory based on the video ID
        output_subdir = os.path.join('./media', '/manifests')
        
        # Create the directory if it does not exist
        if not os.path.exists(output_subdir):
            os.makedirs(output_subdir)
        
        # Generate the output .mpd file path
        # output_file = os.path.join(output_subdir, filename.replace('.mp4', '.mpd'))
        output_file = os.path.join(output_subdir, video_id + '.mpd')

        # Construct the FFmpeg command
        ffmpeg_command = ffmpeg_command_template.format(input_file=input_file, segments_dir='/segments', output_file=output_file)
        
        # Execute the FFmpeg command
        print(f"Processing: {filename} -> {output_file}")
        subprocess.run(ffmpeg_command, shell=True)
        print(f"Finished: {filename}")

print("All videos processed.")
