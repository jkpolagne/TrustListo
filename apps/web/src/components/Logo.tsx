import logo from '../assets/logo.png';

export function Logo({ className = 'h-10' }: { className?: string }) {
  return <img src={logo} alt="TrustListo" className={`w-auto ${className}`} />;
}
