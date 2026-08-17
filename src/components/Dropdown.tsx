import { ChangeEvent, FocusEvent, useState } from "react"
import './Dropdown.css'

export type DropdownId = 'electric' | 'bass'

type DropdownProps = {
    activeDropdown: DropdownId | undefined
    onChange: (dropdown: DropdownId) => void
}

const Dropdown = ({ activeDropdown, onChange}: DropdownProps) => {
    const [dropdownInvalid, setDropdownInvalid] = useState(false)

    const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        onChange(event.target.value as DropdownId)
    }

    const handleBlur = (event: FocusEvent<HTMLSelectElement>): void => {
        setDropdownInvalid(event.target.value !== 'electric' && event.target.value !== 'bass')
    }

    return (
        <label className="field">
            <span className="field-label">Pick your instrument</span>
            <select
                className={`field-select${dropdownInvalid ? ' field-select-invalid' : ''}`}
                value={activeDropdown ?? ''}
                onChange={handleChange}
                onBlur={handleBlur}
            >
                <option value="" disabled hidden>Select instrument</option>
                <option value="electric">Electric guitar</option>
                <option value="bass">Bass guitar</option>
            </select>
            {dropdownInvalid && <p className="field-error">Please select an instrument.</p>}
        </label>
    )
}

export default Dropdown