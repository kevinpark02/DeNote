import { ChangeEvent } from "react"
import './Dropdown.css'

export type DropdownId = 'electric' | 'bass'

type DropdownProps = {
    activeDropdown: DropdownId | undefined
    onChange: (dropdown: DropdownId) => void
}

const Dropdown = ({ activeDropdown, onChange}: DropdownProps) => {
    const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        onChange(event.target.value as DropdownId)
    }

    return (
        <label className="field">
            <span className="field-label">Pick your instrument</span>
            <select
                className="field-select"
                value={activeDropdown ?? ''}
                onChange={handleChange}
            >
                <option value="" disabled hidden>Select instrument</option>
                <option value="electric">Electric guitar</option>
                <option value="bass">Bass guitar</option>
            </select>
        </label>
    )
}

export default Dropdown