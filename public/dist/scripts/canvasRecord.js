
    'use strict';
    // fetching DOM references
    var btnStartRecording = document.querySelector('#btn-start-recording');
    var btnStopRecording = document.querySelector('#btn-stop-recording');

    var videoElement = document.querySelector('video');

    var progressBar = document.querySelector('#progress-bar');
    var percentage = document.querySelector('#percentage');



    // global variables
    var currentBrowser = !!navigator.mozGetUserMedia ? 'gecko' : 'chromium';

    var fileName;
    var audioRecorder;
    var elementToShare = document.getElementById('elementToShare');
    var videoRecorder = RecordRTC(elementToShare, {
                type: 'canvas'
        });

    // Firefox can record both audio/video in single webm container
    // Don't need to create multiple instances of the RecordRTC for Firefox
    // You can even use below property to force recording only audio blob on chrome
    // var isRecordOnlyAudio = true;
    var isRecordOnlyAudio = !!navigator.mozGetUserMedia;

    // if recording only audio, we should replace "HTMLVideoElement" with "HTMLAudioElement"
    if (isRecordOnlyAudio && currentBrowser == 'chromium') {
        var parentNode = videoElement.parentNode;
        parentNode.removeChild(videoElement);

        videoElement = document.createElement('audio');
        videoElement.style.padding = '.4em';
        videoElement.controls = true;
        parentNode.appendChild(videoElement);
    }
    // reusable helpers

    // this function submits both audio/video or single recorded blob to nodejs server
    function postFiles(audio, video) {
        console.log("Posting  files to the server");
        // getting unique identifier for the file name
        fileName = generateRandomString();

        // this object is used to allow submitting multiple recorded blobs
        var files = {};

        // recorded audio blob
        files.audio = {
            name: fileName + '.' + audio.blob.type.split('/')[1],
            type: audio.blob.type,
            contents: audio.dataURL
        };

        files.video = {
            name: fileName + '.' + video.blob.type.split('/')[1],
            type: video.blob.type,
            contents: video.dataURL
        };
        

        files.uploadOnlyAudio = !video;

        videoElement.src = '';
        videoElement.poster = '/ajax-loader.gif';

        xhr('/upload', JSON.stringify(files), function(_fileName) {
            var href = location.href.substr(0, location.href.lastIndexOf('/') + 1);
            videoElement.src = href + 'uploads/' + _fileName;
            videoElement.play();
            videoElement.muted = false;
            videoElement.controls = true;

            var h2 = document.createElement('h2');
            h2.innerHTML = '<a href="' + videoElement.src + '">' + videoElement.src + '</a>';
            document.body.appendChild(h2);
        });

        if (mediaStream) mediaStream.stop();
    }

    // XHR2/FormData
    function xhr(url, data, callback) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {
                callback(request.responseText);
            }
        };

        request.upload.onprogress = function(event) {
            progressBar.max = event.total;
            progressBar.value = event.loaded;
            progressBar.innerHTML = 'Upload Progress ' + Math.round(event.loaded / event.total * 100) + "%";
        };

        request.upload.onload = function() {
            percentage.style.display = 'none';
            progressBar.style.display = 'none';
        };
        request.open('POST', url);
        request.send(data);
    }

    // generating random string
    function generateRandomString() {
        if (window.crypto) {
            var a = window.crypto.getRandomValues(new Uint32Array(3)),
                token = '';
            for (var i = 0, l = a.length; i < l; i++) token += a[i].toString(36);
            return token;
        } else {
            return (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '');
        }
    }

    // when btnStopRecording is clicked
    function onStopRecording() {
        console.log("Function onStopRecord");
        audioRecorder.getDataURL(function(audioDataURL) {
            var audio = {
                blob: audioRecorder.getBlob(),
                dataURL: audioDataURL
            };

            // if record both wav and webm
            console.log(" Stop recording video");
                videoRecorder.getDataURL(function(videoDataURL) {
                    var video = {
                        blob: videoRecorder.getBlob(),
                        dataURL: videoDataURL
                    };

                    console.log("Obtained the files to post");
                    postFiles(audio, video);
                });
            

            // if record only audio (either wav or ogg)
            if (isRecordOnlyAudio) postFiles(audio);
        });
    }
    var mediaStream = null;
    // reusable getUserMedia
    function captureUserMedia(success_callback) {
        var session = {
            audio: true,
            video: true
        };

        navigator.getUserMedia(session, success_callback, function(error) {
            alert(JSON.stringify(error));
        });
    }
    
    // UI events handling
   
    btnStartRecording.onclick = function() {
        window.alert("Are you sure you want to start recording ?");
        btnStartRecording.disabled = true;
        console.log("Record button clicked");

        captureUserMedia(function(stream) {
            mediaStream = stream;

           /* videoElement.src = window.URL.createObjectURL(stream);
            videoElement.play();
            videoElement.muted = true;
            videoElement.controls = false;

            // it is second parameter of the RecordRTC*/
            var audioConfig = {};
           /* if (!isRecordOnlyAudio) {
                audioConfig.onAudioProcessStarted = function() {
                    // invoke video recorder in this callback
                    // to get maximum sync
                    console.log("Starting the video recording");
                    videoRecorder.startRecording();
                };
            }*/
            
            // enable stop-recording button
            btnStopRecording.disabled = false;
            
            audioRecorder = RecordRTC(stream, audioConfig);
            audioRecorder.startRecording();
            videoRecorder.startRecording();


            
        });
    };


    btnStopRecording.onclick = function() {
        console.log("Recording stopped");
        btnStartRecording.disabled = false;
        btnStopRecording.disabled = true;

        /*if (isRecordOnlyAudio) {
            audioRecorder.stopRecording(onStopRecording);
        }*/

        audioRecorder.stopRecording(function() {
                videoRecorder.stopRecording(function() {
                    onStopRecording();
                });
        });
        
    };
    

    
    window.onbeforeunload = function() {
        startRecording.disabled = false;
    };
    