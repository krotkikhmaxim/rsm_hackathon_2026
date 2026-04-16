import {ThreatCard} from "../components/cards/ThreatCard";
import {Report} from "../components/Report";

export const DashboardPage = () => {
  return (
    <div>
      <div className="top-grid">
        <ThreatCard
  name="Malware"
  probability={0.72}
/>
        
      </div>
      <Report />
    </div>
  );
}