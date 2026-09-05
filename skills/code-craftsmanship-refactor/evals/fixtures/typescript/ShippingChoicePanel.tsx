type ShippingOption = {
  id: string;
  label: string;
  eta: string;
  price: number;
};

type Props = {
  options: ShippingOption[];
  selectedId: string;
  currency: string;
  onSelect: (id: string) => void;
};

export function ShippingChoicePanel({
  options,
  selectedId,
  currency,
  onSelect,
}: Props) {
  return (
    <fieldset aria-describedby="shipping-help">
      <legend>Shipping method</legend>
      <p id="shipping-help">Choose one option before continuing.</p>
      <div className="shipping-options">
        {options.map((option) => {
          const inputId = `shipping-${option.id}`;
          const isSelected = selectedId === option.id;

          return (
            <label key={option.id} htmlFor={inputId} data-selected={isSelected}>
              <input
                id={inputId}
                type="radio"
                name="shipping-option"
                value={option.id}
                checked={isSelected}
                onChange={() => onSelect(option.id)}
              />
              <span>{option.label}</span>
              <span>{option.eta}</span>
              <span>{option.price.toFixed(2)} {currency}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
