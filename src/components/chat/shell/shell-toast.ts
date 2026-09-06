import type { ToastInput } from "@/components/shared/motion/animated-toast-stack"

let showShellToastImpl: (input: ToastInput) => void = () => {}

export function bindShellToast(showToast: (input: ToastInput) => void) {
  showShellToastImpl = showToast
}

export function showShellToast(input: ToastInput) {
  showShellToastImpl(input)
}
