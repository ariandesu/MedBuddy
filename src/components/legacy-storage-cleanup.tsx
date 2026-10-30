"use client";

import { useEffect } from "react";

const LEGACY_KEYS = [
  "medisathi_sample_documents",
  "medisathi_sample_extractions",
  "medisathi_sample_medical_records",
];

export default function LegacyStorageCleanup() {
  useEffect(() => {
    LEGACY_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });
  }, []);
  return null;
}
