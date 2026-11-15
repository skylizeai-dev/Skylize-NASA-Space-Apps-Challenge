// v4: the same dashboard in a light, glass-style theme. Every colour comes from
// tokens, so this wrapper only switches the token set (see app/globals.css).
export default function V4Layout({ children }: LayoutProps<"/v4">) {
  return (
    <div data-theme="v4" className="flex min-h-full flex-1 flex-col">
      {children}
    </div>
  );
}
