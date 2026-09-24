/** Pantalla de carga mientras se resuelve la página publicada (SSR + datos de Supabase). */
export default function LoadingCmsPage() {
  return (
    <main className="section" aria-busy="true">
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 0', color: '#63656d' }}>
        <span
          style={{ width: 34, height: 34, border: '4px solid #e6e4de', borderTopColor: '#dd5a10', borderRadius: '50%', display: 'inline-block', animation: 'cmsspin .8s linear infinite' }}
        />
        <p style={{ margin: 0 }}>Cargando página…</p>
      </div>
      <style>{`@keyframes cmsspin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}
