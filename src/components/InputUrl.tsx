import { ChangeEvent } from 'react'
import './Dropdown.css'

type InputUrlProps = {
    url: string
    onChange: (url: string) => void
}

const InputUrl = ({ url, onChange }: InputUrlProps) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        onChange(event.target.value)
    }

    return (
        <label className="field">
            <span className="field-label">YouTube URL</span>
            <input
                type="text"
                className="field-select"
                placeholder="Paste a YouTube video URL"
                value={url}
                onChange={handleChange}
            />
        </label>
    )
}

export default InputUrl