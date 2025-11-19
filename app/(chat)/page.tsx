import React from "react";

import { auth } from "../../app/(auth)/auth";
import { Chat } from "../../components/custom/chat";
import { generateUUID } from "../../lib/utils";

export default async function Page() {
  const id = generateUUID();
  const session = await auth();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "OMS Chat Assistant",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI assistant to discover publishers for backlinks, apply filters, and checkout.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Chat key={id} id={id} initialMessages={[]} user={session?.user} />
    </>
  );
}
