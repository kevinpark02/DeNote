import { ExtensionMessage } from '../messages'

interface ChromeTabCaptureConstraints extends MediaTrackConstraints {
    mandatory: {
        chromeMediaSource: 'tab'
        chromeMediaSourceId: string
    }
}

let audioContext: AudioContext | null = null
let mediaStream: MediaStream | null = null
let intervalId: number | null = null

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'CAPTURE_STREAM') {
        startCapture(message.streamId).catch((error) => {
            console.error('DeNote: startCapture failed', error)
        })
    }
    if (message.type === 'STOP_CAPTURE' || message.type === 'PLAYBACK_ENDED') {
        stopCapture()
    }
})

const startCapture = async (streamId: string): Promise<void> => {
    mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId,
            },
        } as ChromeTabCaptureConstraints,
        video: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId,
            },
        } as ChromeTabCaptureConstraints,
    })

    mediaStream.getVideoTracks().forEach((track) => track.stop())

    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(mediaStream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048

    source.connect(analyser)
    source.connect(audioContext.destination)

    const data = new Float32Array(analyser.fftSize)
    const tick = () => {
        analyser.getFloatTimeDomainData(data)

        // TODO: pitch detection — feed `data` into an analysis algorithm here
    }
    intervalId = window.setInterval(tick, 500)
}

const stopCapture = (): void => {
    if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
    }
    mediaStream?.getTracks().forEach((track) => track.stop())
    audioContext?.close()
    mediaStream = null
    audioContext = null
}
