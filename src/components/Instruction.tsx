import './Instruction.css'

const Instruction = () => {
  return (
    <div className="instruction">
      <p className="instruction-title">
        Want to learn an electric guitar or bass part from YouTube?
      </p>
      <ul className="instruction-steps">
        <li>Navigate to the "Listen" tab</li>
        <li>Select "Electric Guitar" or "Bass Guitar"</li>
        <li>Paste in the URL of the YouTube video</li>
        <li>Specify the time range of the video</li>
        <li>Press "Listen"</li>
        <li>You will find your tutorial in the "Learn" tab</li>
      </ul>
    </div>
  )
}

export default Instruction