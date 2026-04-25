export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/historial/:path*", "/cuenta/:path*"]
};

