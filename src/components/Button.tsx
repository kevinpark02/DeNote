import './Dropdown.css'

type ButtonProps = {
    disabled: boolean
    onClick: () => void
}

const Button = ({ disabled, onClick }: ButtonProps) => {
    return (
        <button className="listen-button" disabled={disabled} onClick={onClick}>
            Listen
        </button>
    )
}

export default Button