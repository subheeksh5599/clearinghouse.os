import { lazy, Suspense } from "react"

const Spline = lazy(() => import("@splinetool/react-spline"))

export default function SplineBackground() {
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-hero-bg" />}>
      <Spline
        scene="https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode"
        className="w-full h-full"
      />
    </Suspense>
  )
}
