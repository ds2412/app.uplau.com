'use client'
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
export default function Home() {
  return (
      <div className="bg-blue-300 p-10">
        <p>test</p>
        <Button variant="outline">Button</Button>
        <Label htmlFor="email">Your email address</Label>
        <Checkbox />
      </div>)
}
