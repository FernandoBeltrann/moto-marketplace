-- Primer artículo de blog, para que /blog no se vea vacío en cuanto se
-- despliegue el módulo. Contenido real (no lorem ipsum) — pensado para
-- publicarse en producción tal cual, ajústalo desde Directus cuando quieras.
--
-- Requiere haber corrido sql/blog_posts.sql primero (crea la tabla).
-- Idempotente: `on conflict (slug) do nothing` — seguro re-correr.
--
-- `published = true`, sin `published_at` explícito: el trigger
-- `blog_posts_set_timestamps()` (de sql/blog_posts.sql) lo fija solo a
-- `now()` en el INSERT porque `published` llega en true. No hace falta
-- tocarlo aquí.

insert into public.blog_posts (
  title, slug, author, excerpt, body, published
)
values
(
  'Cómo elegir tu primera moto: guía rápida para no equivocarte',
  'como-elegir-tu-primera-moto',
  'Equipo MotoClick',
  'Antes de comprar tu primera moto conviene revisar cuatro cosas: para qué la vas a usar, qué cilindrada te conviene, cuál es tu presupuesto real mes a mes, y qué garantía tienes si algo falla. Te lo explicamos en unos minutos.',
  $body$<p>Comprar tu primera moto es una decisión que combina presupuesto, uso diario y gustos personales. Antes de decidirte por un modelo porque "se ve bien" o porque un amigo tiene uno parecido, vale la pena revisar estos puntos con calma.</p>

<h2>¿Para qué vas a usar la moto?</h2>
<p>Es la pregunta que más debería influir en tu elección, y la que menos se piensa a fondo. No es lo mismo una moto para moverte todos los días en ciudad, que una para viajar los fines de semana o una que combine ambos usos.</p>
<ul>
  <li><strong>Traslados diarios:</strong> prioriza consumo de gasolina, comodidad y facilidad para moverte entre el tráfico.</li>
  <li><strong>Trabajo o reparto:</strong> revisa capacidad de carga, durabilidad y costo de mantenimiento.</li>
  <li><strong>Fines de semana y carretera:</strong> aquí sí pesan más la cilindrada y la comodidad en viajes largos.</li>
</ul>

<h2>Cilindrada: ni tan poca ni tan mucha</h2>
<p>Para quienes manejan una moto por primera vez, lo más común es empezar entre 150cc y 200cc. Es suficiente para moverte con soltura en ciudad y carretera corta, sin la curva de aprendizaje ni el costo de mantenimiento de cilindradas más grandes. Puedes crecer a algo más potente después, cuando ya tengas kilómetros de experiencia.</p>

<h2>Define tu presupuesto real (no solo el precio de lista)</h2>
<p>El precio de la moto es solo una parte del cálculo. Lo que de verdad determina si te alcanza es la mensualidad, el enganche y el plazo del financiamiento. En MotoClick puedes ver, para cada moto, el enganche sugerido y el pago mensual estimado, y arrancar tu compra con financiamiento gestionado por Finva sin tener que hacer el cálculo tú mismo.</p>
<blockquote>Un buen punto de partida: define cuánto puedes pagar al mes de forma cómoda, y busca motos cuya mensualidad estimada esté por debajo de ese número, no justo en el límite.</blockquote>

<h2>Compra con garantía y soporte</h2>
<p>Una moto nueva con garantía te protege de gastos inesperados en los primeros meses, que es cuando más se agradece no tener sorpresas. Antes de comprar, confirma qué cubre la garantía, por cuánto tiempo y dónde puedes darle servicio.</p>

<p>Si ya tienes una idea de para qué la vas a usar y cuánto puedes pagar al mes, el siguiente paso es sencillo: explora el <a href="/motos">catálogo de motos nuevas</a> y filtra por presupuesto y categoría para ver tus opciones reales.</p>$body$,
  true
)
on conflict (slug) do nothing;
