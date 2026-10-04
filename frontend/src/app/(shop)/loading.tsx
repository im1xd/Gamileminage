export default function Loading() {
  return (
    <div className="container" style={{ paddingBlock: '2rem' }} aria-busy>
      <div className="skeleton" style={{ height: 38, width: 240, marginBlockEnd: '1.5rem' }} />
      <div className="product-grid">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4 / 6' }} />)}
      </div>
    </div>
  );
}
