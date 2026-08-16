import { useState } from 'react'
import Dropdown, { DropdownId } from './Dropdown'
import './Listen.css'

const Listen = () => {
  const [activeDropdown, setActiveDropdown] = useState<DropdownId | undefined>(undefined)
  return (
    <div className="listen">
      <Dropdown activeDropdown={activeDropdown} onChange={setActiveDropdown} />
    </div>
  )
}

export default Listen