import "./Input.css";

export default function Input({
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
  icon,
  rightElement,
  name,
  id,
  required = false,
  className = "",
}) {
  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label className="input-label" htmlFor={id || name}>
          {label}
        </label>
      )}

      <div className="input-wrap">
        {icon && <span className="material-symbols-outlined input-icon">{icon}</span>}

        <input
          id={id || name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          required={required}
          onChange={onChange}
          className={icon ? "input input--with-icon" : "input"}
        />

        {rightElement && <div className="input-right">{rightElement}</div>}
      </div>
    </div>
  );
}