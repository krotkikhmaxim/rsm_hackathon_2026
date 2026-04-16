export const MainLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="layout">

      <div className="sidebar">
        Sidebar
      </div>

      <div className="content">
        {children}
      </div>

    </div>
  );
};