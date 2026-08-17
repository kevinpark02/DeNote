import './Dropdown.css'

type ButtonProps = {
    disabled: boolean
}

const Button = ({ disabled }: ButtonProps) => {
    return (
        <button className="listen-button" disabled={disabled}>
            Listen
        </button>
    )

}

export default Button