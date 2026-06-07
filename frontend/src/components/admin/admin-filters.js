export function renderAdminFilterBar({ fields, resetLabel = "清除篩選" }) {
  const controls = fields
    .map((field) => {
      if (field.type === "select") {
        return `
          <div class="col-12 col-md-4 col-xl-3">
            <label class="form-label small text-secondary mb-1">${field.label}</label>
            <select class="form-select" data-filter-key="${field.key}">
              ${field.options
                .map((option) => `<option value="${option.value}">${option.label}</option>`)
                .join("")}
            </select>
          </div>
        `;
      }

      return `
        <div class="col-12 col-md-6 col-xl-4">
          <label class="form-label small text-secondary mb-1">${field.label}</label>
          <input
            class="form-control"
            type="${field.type || "text"}"
            placeholder="${field.placeholder || ""}"
            data-filter-key="${field.key}"
          />
        </div>
      `;
    })
    .join("");

  return `
    <section class="block-card shadow-sm mb-3">
      <div class="block-body">
        <form class="row g-2 align-items-end" data-admin-filter-form>
          ${controls}
          <div class="col-12 col-md-4 col-xl-2">
            <button type="button" class="btn btn-outline-secondary w-100" data-filter-reset>
              ${resetLabel}
            </button>
          </div>
        </form>
      </div>
    </section>
  `;
}

export function getFilterValues(form) {
  const values = {};
  const controls = form.querySelectorAll("[data-filter-key]");

  controls.forEach((control) => {
    values[control.dataset.filterKey] = control.value.trim();
  });

  return values;
}

export function resetFilterValues(form) {
  const controls = form.querySelectorAll("[data-filter-key]");
  controls.forEach((control) => {
    if (control.tagName.toLowerCase() === "select") {
      control.selectedIndex = 0;
      return;
    }
    control.value = "";
  });
}
