document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('pcmFile');
    const audioPlayer = document.getElementById('audioPlayer');
    const sampleRateInput = document.getElementById('sampleRateInput');
    const channelsInput = document.getElementById('channelsInput');
    const bitDepthSpan = document.getElementById('bitDepth');

    // 添加拖放功能
    const uploadSection = document.querySelector('.upload-section');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadSection.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadSection.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadSection.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        uploadSection.classList.add('highlight');
    }

    function unhighlight(e) {
        uploadSection.classList.remove('highlight');
    }

    uploadSection.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        handleFile(files[0]);
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFile(file);
    });

    function handleFile(file) {
        if (!file) {
            alert('请选择PCM文件');
            return;
        }

        // 获取用户输入的参数
        const PCM_PARAMS = {
            sampleRate: parseInt(sampleRateInput.value),
            channels: parseInt(channelsInput.value),
            bitDepth: 16
        };

        // 读取PCM文件
        const reader = new FileReader();
        reader.onload = (e) => {
            const pcmData = new Int16Array(e.target.result);
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建音频缓冲区
            const audioBuffer = audioContext.createBuffer(
                PCM_PARAMS.channels,
                pcmData.length / PCM_PARAMS.channels,
                PCM_PARAMS.sampleRate
            );

            // 将PCM数据复制到音频缓冲区
            for (let channel = 0; channel < PCM_PARAMS.channels; channel++) {
                const channelData = audioBuffer.getChannelData(channel);
                for (let i = 0; i < channelData.length; i++) {
                    channelData[i] = pcmData[i * PCM_PARAMS.channels + channel] / 32768.0;
                }
            }

            // 创建音频源并播放
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);

            // 创建Blob URL用于audio标签播放
            const wavBlob = createWavFile(pcmData, PCM_PARAMS);
            const audioUrl = URL.createObjectURL(wavBlob);
            audioPlayer.src = audioUrl;
        };

        reader.readAsArrayBuffer(file);
    }
});

function createWavFile(pcmData, params) {
    const numChannels = params.channels;
    const sampleRate = params.sampleRate;
    const bitsPerSample = params.bitDepth;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // WAV文件头
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // 写入PCM数据
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(offset, pcmData[i], true);
        offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
} 