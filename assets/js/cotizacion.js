// Borrador efímero: no envía formularios, no guarda datos ni carga servicios.
const occasions = Object.freeze({ general:'Aún por definir', cumpleanos:'Cumpleaños', bodas:'Boda', xv_anos:'XV años', baby_shower:'Baby shower', bautizos:'Bautizo', eventos:'Otro evento' });
const deliveries = Object.freeze({ pendiente:'Aún por definir', recoger:'Prefiero recoger', entrega:'Quiero consultar entrega (por confirmar)' });
const sources = new Set(['principal','bodas','xv_anos','cumpleanos','baby_shower','bautizos','eventos']);
const section = document.getElementById('cotizar');
const form = document.getElementById('cotizacion-form');
const occasion = document.getElementById('cotizacion-ocasion');
const date = document.getElementById('cotizacion-fecha');
const portions = document.getElementById('cotizacion-porciones');
const delivery = document.getElementById('cotizacion-entrega');
const idea = document.getElementById('cotizacion-idea');
const preview = document.getElementById('cotizacion-mensaje');
const onward = document.getElementById('cotizacion-continuar');
const error = document.getElementById('cotizacion-error');
const status = document.getElementById('cotizacion-estado');

function today() {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = name => parts.find(p => p.type === name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function message() {
  const formattedDate = date.value ? date.value.split('-').reverse().join('/') + ' (por confirmar)' : 'Aún por definir';
  return `Hola Dulce Aury, quiero cotizar un pastel personalizado.\n\nOcasión: ${occasions[occasion.value] || occasions.general}\nFecha: ${formattedDate}\nPorciones: ${portions.value || 'Aún por definir'}\nEntrega o recogida: ${deliveries[delivery.value] || deliveries.pendiente}\nIdea: ${idea.value.trim() || 'Me gustaría que me orientaran.'}\n\nLes escribo desde dulceaury.com.`;
}
function update() {
  error.textContent = '';
  status.textContent = '';
  date.setCustomValidity('');
  portions.setCustomValidity('');
  const text = message();
  preview.textContent = text;
  onward.href = 'https://wa.me/50250193398?text=' + encodeURIComponent(text);
  onward.dataset.waOccasion = Object.hasOwn(occasions, occasion.value) ? occasion.value : 'general';
}
function valid() {
  date.min = today();
  date.setCustomValidity(date.value && date.value < date.min ? 'Elige una fecha de hoy en adelante, o déjala por definir.' : '');
  portions.setCustomValidity(portions.value && (!Number.isSafeInteger(Number(portions.value)) || Number(portions.value) < 1) ? 'Indica un número entero de porciones mayor que cero, o déjalo por definir.' : '');
  if (form.checkValidity()) return true;
  error.textContent = 'Revisa la fecha o las porciones. Puedes dejarlas en blanco si aún no las sabes.';
  form.reportValidity();
  return false;
}

form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', update);
form.addEventListener('change', update);
for (const type of ['click','auxclick']) onward.addEventListener(type, event => {
  if (!valid()) event.preventDefault();
});
document.getElementById('cotizacion-copiar').addEventListener('click', async () => {
  if (!valid()) return;
  try {
    await navigator.clipboard.writeText(preview.textContent);
    status.textContent = 'Mensaje copiado. Puedes pegarlo en la conversación de WhatsApp.';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(preview);
    selection.removeAllRanges(); selection.addRange(range);
    preview.focus();
    status.textContent = 'No se pudo copiar automáticamente. El mensaje está seleccionado: cópialo y pégalo en WhatsApp.';
  }
});

// Captura antes de analítica: entrar al formulario no es salir a WhatsApp.
// Ctrl, Cmd y botón central conservan el enlace directo original como alternativa.
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest?.('a[data-wa-button]');
  if (!link || link.closest('#cotizar') || !sources.has(link.dataset.waButton)) return;
  event.preventDefault();
  onward.dataset.waButton = link.dataset.waButton;
  if (link.dataset.waButton !== 'principal') occasion.value = link.dataset.waButton;
  update();
  section.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'});
  document.getElementById('cotizacion-titulo').focus({preventScroll:true});
}, true);
date.min = today();
update();
section.hidden = false;
document.getElementById('ocasiones-ayuda').textContent = 'Elige la ocasión y cuéntanos tu idea para preparar tu mensaje.';
// Evitar que los controles flotantes tapen campos o la salida del formulario.
if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
  document.body.classList.toggle('cotizacion-visible', entry.isIntersecting);
}, {threshold:0}).observe(section);
