type Props = {
  name: string;
  probability: number;
};

export const ThreatCard = ({
  name,
  probability
}: Props) => {

  return (

    <div className="threat-card">

      <h4>{name}</h4>

      <p>
        {(probability * 100).toFixed(0)}%
      </p>

    </div>

  );
};