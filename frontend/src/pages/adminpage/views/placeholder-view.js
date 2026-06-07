export async function renderPlaceholderView(container, title, description) {
  container.innerHTML = `
    <section class="block-card shadow-sm">
      <div class="block-body p-4">
        <h1 class="h4 mb-2">${title}</h1>
        <p class="text-secondary mb-0">${description}</p>
      </div>
    </section>
  `;
}
