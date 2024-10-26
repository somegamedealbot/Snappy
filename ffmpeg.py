import os
import subprocess

# Specify the input directory
input_dir = './videos'
# Create the FFmpeg command template
ffmpeg_command_template = (
    "ffmpeg -i \"{input_file}\" "
    "-map 0:v -b:v:0 254k -s:v:0 320x180 "
    "-map 0:v -b:v:1 507k -s:v:1 320x180 "
    "-map 0:v -b:v:2 759k -s:v:2 480x270 "
    "-map 0:v -b:v:3 1013k -s:v:3 640x360 "
    "-map 0:v -b:v:4 1254k -s:v:4 640x360 "
    "-map 0:v -b:v:5 1883k -s:v:5 768x432 "
    "-map 0:v -b:v:6 3134k -s:v:6 1024x576 "
    "-map 0:v -b:v:7 4952k -s:v:7 1280x720 "
    "-adaptation_sets 'id=0,streams=v' "
    "-init_seg_name '{video_name}-init_$RepresentationID$.m4s' "
    "-media_seg_name '{video_name}-chunk_$Bandwidth$_$Number$.m4s' "
    "-use_template 1 -use_timeline 1 "
    "-f dash \"{output_file}\""
)

ffmpeg_thumbnail_command = (
    "ffmpeg -i {input_file} "
    "-vf \"thumbnail,scale=320:240\" " 
    "-frames:v 1 {output_file} "
)

# Function to extract the ID from the filename
def extract_id(filename):
    return filename.split('-')[0]

# Loop through all video files in the input directory
for filename in os.listdir(input_dir):
    if filename.endswith(".mp4"):  # Ensure it's a video file

        input_file = os.path.join(input_dir, filename)
        # video_name = filename.split('.')[0]
        video_id = extract_id(filename)

        # # Create output directories
        # output_subdir = os.path.join('./media', 'manifests')
        # segments_dir = os.path.join('./media', 'segments')

        # os.makedirs(output_subdir, exist_ok=True)
        # os.makedirs(segments_dir, exist_ok=True)

        # # Generate the output .mpd file path
        # output_file = os.path.join(output_subdir, video_id + '.mpd')

        # # Construct the FFmpeg command
        # ffmpeg_command = ffmpeg_command_template.format(
        #     input_file=input_file, video_name=video_name, output_file=output_file
        # )

        # # Debug output file path
        # print(f"Output file path: {output_file}")

        # # Execute the FFmpeg command
        # result = subprocess.run(ffmpeg_command, shell=True)

        # # Check for errors
        # if result.returncode != 0:
        #     print(f"Error processing {filename}: {result.stderr}")
        
        thumbnail_dir = os.path.join('./media', 'thumbnails')
        os.makedirs(thumbnail_dir, exist_ok=True)


        output_file = os.path.join(thumbnail_dir, video_id + '.jpg')

        ffmpeg_command = ffmpeg_thumbnail_command.format(
            input_file=input_file, output_file=output_file
        )

        result = subprocess.run(ffmpeg_command, shell=True)

print("All videos processed.")