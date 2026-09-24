import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/site';
import { StepsTabs } from '@/components/StepsTabs';
import { FaqAccordion, type FaqItem } from '@/components/FaqAccordion';

// Contenido tomado del prototipo de referencia (artifact de Diego).
const SELECCIONA_FAQS: FaqItem[] = [
  {
    id: 'moto-correcta',
    question: '¿Cómo elijo la moto correcta para mí?',
    answer:
      'Depende de tu uso principal: trabajo, ciudad o placer. Filtra el catálogo por presupuesto, marca y uso, y revisa la sección "¿Para quién es buena?" en cada ficha de moto para ver si encaja con lo que necesitas.',
  },
  {
    id: 'repartidor',
    question: '¿Cuál es la mejor moto para trabajar de repartidor en México?',
    answer:
      'Para trabajo de reparto, lo que más importa es bajo consumo de gasolina, mantenimiento económico y resistencia para uso diario intenso, no potencia. La Bajaj Boxer BM 150 es la única moto del catálogo pensada específicamente para esto: está etiquetada para trabajo diario, reparto y bajo costo de uso, con un motor pequeño que prioriza durabilidad sobre velocidad. Si tu trabajo incluye caminos sin pavimentar o zonas rurales, la Yamaha XTZ 150 es la alternativa de doble propósito, con mejor manejo en terracería a cambio de un costo mayor.',
  },
  {
    id: 'uso-diario-ciudad',
    question: '¿Qué moto elegir para uso diario en ciudad?',
    answer:
      'En ciudad, lo que hace la diferencia es el peso (más ligera es más fácil en tráfico), el consumo de gasolina y si trae frenos ABS. El catálogo ofrece varias opciones según qué priorices: la Bajaj Pulsar N160 FI ABS UG suma ABS de fábrica, un plus de seguridad en frenadas de tráfico urbano. La Yamaha FZ-S FI 2.0 está etiquetada como "primera moto", pensada para quien recién empieza a manejar en ciudad. La Suzuki Gixxer 150 y la Yamaha FZ 3.0 FI son naked urbanas de perfil similar, con diseño más deportivo. La <a href="https://www.motoclick.mx/motos/cfmoto/300nk-2026" target="_blank" rel="noopener">CFMOTO 300NK</a> suma otra opción naked de ciudad, con tecnología más moderna dentro del segmento. Si nunca has manejado moto, prioriza ABS y peso ligero sobre potencia.',
  },
  {
    id: 'principiantes',
    question: 'Motos de bajo cilindraje para principiantes: guía 2026',
    answer:
      'Para alguien que empieza, un motor pequeño no es una limitación, es una ventaja: menos peso, menos potencia que controlar mientras aprendes, y menor riesgo si te equivocas en una maniobra. El catálogo marca directamente dos opciones para este perfil: la Yamaha FZ-S FI 2.0, etiquetada como "primera moto", y la KTM Duke 200, etiquetada "primera KTM" y "popular".',
  },
  {
    id: 'bajaj-vs-yamaha',
    question: 'Bajaj vs Yamaha: ¿cuál conviene para trabajo diario?',
    answer:
      'Comparando las dos opciones del catálogo pensadas para trabajo: la Bajaj Boxer BM 150 está construida para reparto urbano, prioriza bajo consumo y bajo costo operativo sobre cualquier otra característica, es la opción más económica del catálogo. La Yamaha XTZ 150 es doble propósito, pensada para quien necesita moverse entre ciudad y terracería como parte del trabajo, con mejor capacidad todo terreno pero un costo mayor. La decisión depende del tipo de terreno que recorras a diario: si es 100% pavimento, la Boxer BM 150 es la opción más eficiente; si hay caminos irregulares, la XTZ 150 justifica su costo adicional.',
  },
  {
    id: 'rinde-gasolina',
    question: '¿Qué moto rinde más gasolina para uso diario?',
    answer:
      'El rendimiento de gasolina depende sobre todo de tres factores: cilindraje (motores más pequeños consumen menos), peso del vehículo, y tipo de manejo (ciudad con muchas paradas consume más que carretera constante). En general, las motos etiquetadas "bajo consumo" en el catálogo, como la Yamaha FZ-S FI 2.0 y la FZ 3.0 FI, están posicionadas específicamente por eficiencia de combustible frente a otras de cilindraje similar.',
  },
  {
    id: 'deportivas-entrada',
    question: 'Motos deportivas de entrada: opciones y qué considerar',
    answer:
      'Antes de elegir una moto deportiva de entrada, lo importante no es la potencia máxima sino qué tan manejable es para alguien sin mucha experiencia: peso, altura del asiento, y si la potencia se entrega de forma progresiva o agresiva. El catálogo ofrece varias opciones en este segmento: la KTM RC 200 está etiquetada directamente como "entrada premium", pensada para quien quiere el carácter de una deportiva sin saltar directo a cilindrajes grandes. La Suzuki Gixxer SF y los modelos de 250cc de QJMotor (SRK 25 R, SRK 250 RS) ofrecen carenado deportivo con un motor más accesible. La <a href="https://www.motoclick.mx/motos/cfmoto/450sr-2025" target="_blank" rel="noopener">CFMOTO 450SR</a> suma a esta categoría con más cilindrada, para quien busca el siguiente escalón dentro del segmento de entrada. La KTM Duke 200 y 250, aunque técnicamente son naked, comparten la posición de manejo deportiva y suelen recomendarse como paso previo a una deportiva carenada.',
  },
];

const APLICA_FAQS: FaqItem[] = [
  {
    id: 'como-funciona',
    question: '¿Cómo funciona MotoClick para financiar una moto?',
    answer:
      'MotoClick conecta tu perfil crediticio con una red de financieras aliadas y de agencias distribuidoras (Yamaha, Suzuki, KTM, Bajaj, CFMOTO, QJMotor, TVS). Evaluamos tu perfil financiero e historial crediticio, y te asignamos la financiera con mayor probabilidad de aprobarte.',
  },
  {
    id: 'financiera-o-intermediario',
    question: '¿MotoClick es la financiera o solo el intermediario?',
    answer:
      'MotoClick no es una financiera. Somos el intermediario que evalúa tu perfil y te conecta con la financiera aliada más viable según tu historial crediticio. La aprobación final y los términos del crédito los define la financiera, no MotoClick. Pero somos tu aliado: te acompañamos en todo el proceso, y si tienes dudas en cualquier momento, estamos para ayudarte.',
  },
  {
    id: 'quien-esta-detras',
    question: '¿Quién está detrás de MotoClick?',
    answer:
      'MotoClick es la plataforma de FINVA para financiar tu moto. FINVA evalúa tu perfil, gestiona todo el trámite con la financiera aliada y te acompaña hasta la entrega, así no tienes que lidiar por separado con bancos o agencias. Trabajamos con financieras afiliadas como HeyBanco, Santander, BBVA, Atrato, Maxikash, CrediToGo y Galgo.',
  },
  {
    id: 'datos-seguros',
    question: '¿Es seguro compartir mis datos personales con MotoClick?',
    answer:
      'Tus datos los usa FINVA únicamente para evaluar tu perfil crediticio, y solo se comparten con la financiera a la que te referimos, para que te acepten en su sistema. No se comparten con nadie más. Es muy importante completar todo el proceso de aplicación: puedes revisar nuestro <a href="/aviso-de-privacidad">aviso de privacidad</a>, nuestros testimoniales, y confirmar que FINVA es una empresa constituida legalmente bajo las leyes mexicanas.',
  },
  {
    id: 'tiempo-aprobacion',
    question: '¿Cuánto tarda la aprobación de un crédito de moto?',
    answer: 'Desde 3 minutos hasta 24 horas, dependiendo del aliado financiero. Los bancos suelen tardar más que las financieras no bancarias.',
  },
  {
    id: 'que-pasa-despues',
    question: '¿Qué pasa después de que me aprueban el crédito?',
    answer:
      'Tu asesor FINVA te lo comunica por WhatsApp (en algunos casos la financiera también envía correo). Aceptas la oferta, pagas el enganche (transferencia o en agencia) y firmas el contrato de crédito, digital o físico según la financiera. En algunos casos el crédito se otorga sin enganche y basta con firmar el contrato para recibir la moto.',
  },
  {
    id: 'documentos-necesarios',
    question: '¿Qué documentos necesito para iniciar el trámite?',
    answer:
      'Siempre se requiere tu INE. Dependiendo de la financiera y de tu perfil, también se puede pedir: comprobante de ingresos de los últimos 3 meses, comprobante de domicilio, referencias, datos de empleo y situación financiera, y una solicitud de crédito firmada. Entre más información compartas, mejores opciones de crédito te podemos ofrecer.',
  },
  {
    id: 'como-aplico',
    question: '¿Cómo aplico mi solicitud?',
    answer:
      'Llenas la solicitud digital de MotoClick/FINVA con tus datos personales, domicilio, datos financieros y de empleo, y autorizas la consulta en sociedades de información crediticia. Con esta información, nuestra tecnología analiza qué financiera se alinea mejor a tu perfil para que te aprueben. Una vez hecho esto, un agente FINVA se comunica contigo por WhatsApp para asesorarte en los siguientes pasos. Dependiendo de la financiera, podemos redirigirte a su propia solicitud (y ellos avisan si te aprueban), o si la financiera lo permite, aplicamos por ti directamente. Tu agente FINVA te acompaña en todo el proceso, desde el inicio hasta la entrega de tu moto.',
  },
  {
    id: 'que-necesito-aprueben',
    question: '¿Qué necesito para que me aprueben un crédito de moto?',
    answer:
      'Necesitamos documentos que nos ayuden a evaluar tu capacidad crediticia. Dependiendo de tu situación, te conectamos con la financiera más viable para que te aprueben tu crédito. Algunas financieras solicitan más documentación que otras, tu asesor FINVA está para ayudarte con esto. Es muy importante completar la solicitud con el banco o la financiera: sin este paso no podemos avanzar. En cuanto confirmamos tu viabilidad, te dirigimos a la financiera que más fácilmente te va a aprobar.',
  },
  {
    id: 'sin-enganche',
    question: '¿Puedo comprar una moto sin enganche?',
    answer:
      'Sí, es posible, dependiendo de la financiera y tu perfil. Hay distintas combinaciones según lo que más te convenga: si priorizas no dar enganche, se ajusta la tasa o el plazo; si buscas la tasa de interés más baja, normalmente se pide más enganche y documentación; si buscas la mensualidad más baja, se necesita un plazo más largo y también más documentación. Cuéntanos qué es lo más importante para ti (enganche, tasa o mensualidad) y buscamos la combinación que mejor se ajuste.',
  },
  {
    id: 'buro-credito',
    question: '¿Puedo comprar una moto a crédito si estoy en el buró de crédito?',
    answer:
      'Sí, es posible. Tener un historial negativo en el buró no descarta automáticamente tu solicitud: MotoClick evalúa tu perfil completo y busca la financiera aliada con mayor probabilidad de aprobarte. Si no calificas directamente, existe la opción de sumar un aval.',
  },
  {
    id: 'que-es-aval',
    question: '¿Qué es un aval y cuándo lo necesito?',
    answer:
      'Un aval es una persona que garantiza el pago de tu crédito si tú no puedes cubrirlo. Se solicita cuando tu perfil no cumple, por sí solo, con los requisitos de la financiera aliada. Debe ser mayor de edad, tener buen historial crediticio y capacidad de pago suficiente. No hay un requisito fijo más allá de eso, depende de cada caso.',
  },
  {
    id: 'comprobar-ingresos',
    question: '¿Cómo comprobar ingresos si trabajo por mi cuenta o soy repartidor?',
    answer:
      'Los estados de cuenta de los últimos meses son el comprobante más aceptado. Si no los tienes, no está todo perdido: hay financieras y bancos que no piden comprobante de ingresos, y algunas aceptan una videollamada en tu lugar de trabajo si tienes empleo informal. Entre más información compartas, mejor te podemos ayudar.',
  },
  {
    id: 'requisitos-independiente',
    question: '¿Qué requisitos aplican si trabajo de forma independiente?',
    answer:
      'Los requisitos son similares a los de cualquier solicitante: comprobantes de ingresos de los últimos 3 meses, comprobante de domicilio reciente, INE, referencias y, en algunos casos, una solicitud firmada. Depende de la financiera: algunas piden solo tu INE y autorización para consultar tu historial crediticio, otras piden la solicitud completa.',
  },
];

const APRUEBA_FAQS: FaqItem[] = [
  {
    id: 'como-me-entero',
    question: '¿Cómo me entero de que fui aprobado?',
    answer:
      'En todos los casos, tu asesor FINVA te lo comunica por WhatsApp. En algunos casos, la financiera también envía un correo con la aprobación o el rechazo. Si te rechazan, no te preocupes: buscamos otra opción de financiera. También es posible que nos pidan más datos para evaluar mejor tu perfil, o si no te gustan las condiciones que te ofrecen, buscamos otras alternativas.',
  },
  {
    id: 'que-pasa-inmediatamente',
    question: '¿Qué pasa inmediatamente después de la aprobación?',
    answer:
      'Pagas el enganche (por transferencia o directo en la agencia donde recogerás la moto) y firmas el contrato de crédito, digital o físico según la financiera. Hay casos donde el crédito se otorga sin enganche, y basta con firmar el contrato para que se entregue la moto.',
  },
  {
    id: 'vigencia-aprobacion',
    question: '¿Cuánto tiempo tengo para completar el trámite antes de que caduque la aprobación?',
    answer: 'Cada financiera tiene su propia política de vigencia, pero ninguna es mayor a 30 días. Algunas tienen vigencia de solo 7 días.',
  },
];

const ESTRENA_FAQS: FaqItem[] = [
  {
    id: 'tiempo-entrega',
    question: '¿Cuánto tarda la entrega después de aprobado?',
    answer:
      'Entre 1 y 10 días hábiles entre la aprobación y la entrega. El tiempo exacto depende de la financiera y de la disponibilidad de inventario en la agencia: si no hay que esperar inventario y todo sale en orden, la entrega puede darse en 1 a 5 días hábiles.',
  },
  {
    id: 'que-llevar',
    question: '¿Qué debo llevar el día de la entrega?',
    answer: 'Tu INE, para poder identificarte.',
  },
  {
    id: 'que-esperar',
    question: '¿Qué debo esperar en la entrega?',
    answer:
      'FINVA revisa que tu documentación esté completa y correcta antes de la entrega. En el momento de recoger tu moto, también se te toma una foto para confirmar que eres tú. La agencia, por su parte, verifica que la moto esté en condiciones óptimas, junto con la póliza de garantía y mantenimientos.',
  },
  {
    id: 'quien-entrega',
    question: '¿Quién me entrega la moto?',
    answer:
      'La agencia distribuidora de la marca que elegiste es quien te entrega físicamente la moto. FINVA te acompaña durante todo el proceso previo (documentación y coordinación) para que, al llegar a la agencia, la entrega sea rápida y sin contratiempos.',
  },
];

const APRUEBA_FLOW =
  'Flujo completo: Aprobación → Aceptación de oferta → Pago de enganche (si aplica) → Firma de contrato → Preparación de documentación → Entrega / Estrena.';
const ESTRENA_FLOW = 'Canal de acompañamiento: WhatsApp, con el agente FINVA presente desde el primer paso hasta la entrega.';

export const metadata: Metadata = {
  title: 'Así funciona comprar tu moto a crédito con Motoclick',
  description:
    'Los 4 pasos para comprar tu moto a crédito con Motoclick: selecciona, aplica, aprueba y estrena. Resuelve tus dudas para elegir la moto correcta para ti.',
  alternates: {
    canonical: `${site.url.replace(/\/$/, '')}/asi-funciona-comprar-tu-moto-a-credito-con-motoclick`,
  },
};

export default function AsiFuncionaPage() {
  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <p className="small muted" style={{ marginBottom: 12 }}>
          <Link href="/">Inicio</Link>
          {' · '}
          <Link href="/motos">Motos</Link>
          {' · '}
          <Link href="/motos-a-credito">Motos a crédito</Link>
        </p>
        <h1 style={{ marginTop: 0 }}>Así funciona comprar tu moto a crédito con Motoclick</h1>
        <p>
          De elegir tu moto a tenerla en tus manos, en 4 pasos. Toca cada uno para ver las preguntas de esa
          etapa. Financiamiento gestionado por Finva.
        </p>

        <StepsTabs
          panels={{
            selecciona: (
              <>
                <FaqAccordion items={SELECCIONA_FAQS} />
                <h3>Lo que dicen nuestros clientes</h3>
                <div className="testimonials-grid">
                  <div className="testimonial-card">
                    <span className="testimonial-card__label">🎬 Testimonio en video</span>
                    <span className="testimonial-card__note">
                      (pendiente de producción — micro-campaña de recolección)
                    </span>
                  </div>
                  <div className="testimonial-card">
                    <span className="testimonial-card__label">⭐ Reseñas de Google</span>
                    <span className="testimonial-card__note">(placeholder — enlazar a reseñas reales cuando existan)</span>
                  </div>
                </div>
              </>
            ),
            aplica: (
              <>
                <FaqAccordion items={APLICA_FAQS} />
                <div className="cta-box">
                  <Link className="btn green" href="/motos-a-credito">
                    Aplica tu crédito ahora
                  </Link>
                  <div className="cta-box__sub">Sin compromiso · Un agente FINVA te acompaña desde el primer paso</div>
                </div>
              </>
            ),
            aprueba: (
              <>
                <FaqAccordion items={APRUEBA_FAQS} />
                <p className="flow-note">{APRUEBA_FLOW}</p>
              </>
            ),
            estrena: (
              <>
                <FaqAccordion items={ESTRENA_FAQS} />
                <p className="flow-note">{ESTRENA_FLOW}</p>
              </>
            ),
          }}
        />

        <p className="small muted" style={{ marginTop: 40 }}>
          ¿Ya sabes qué moto quieres?{' '}
          <Link href="/motos-a-credito">Ver motos a crédito</Link>.
        </p>
      </div>
    </main>
  );
}
