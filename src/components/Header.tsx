import logo from "@/assets/logo.png";

const Header = () => {
  return (
    <header className="py-8">
      <div className="container max-w-4xl mx-auto flex items-center justify-center gap-4">
        <img
          src={logo}
          alt="مملكة الخطوط"
          width={48}
          height={48}
          className="w-12 h-12 rounded-lg object-contain"
        />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            مملكة الخطوط
          </h1>
          <p className="text-sm text-muted-foreground">
            تعرف على الخط العربي من الصورة
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
