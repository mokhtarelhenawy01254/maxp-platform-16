import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChartBarIcon, DocumentTextIcon, KeyIcon, ServerStackIcon } from "@heroicons/react/24/outline";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDirection } from "../../../i18n";
import { getDevStrings } from "./devI18n";
import ApiKeysTab from "./ApiKeysTab";
import ApiDocsTab from "./ApiDocsTab";
import McpTab from "./McpTab";
import UsageTab from "./UsageTab";

/**
 * Developer Hub — a single Settings tab hosting four independent sub-screens
 * (API keys / documentation / MCP / usage). Each sub-screen keeps its own
 * state and error handling so a failure in one never affects the others.
 */
const DeveloperHubPage: React.FC = () => {
  const { i18n } = useTranslation();
  const s = useMemo(() => getDevStrings(i18n.language), [i18n.language]);
  const [tab, setTab] = useState("keys");

  return (
    <div dir={getDirection()} className="w-full">
      <header className="mb-5 border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-foreground text-balance">{s.hubTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{s.hubSubtitle}</p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="keys" className="gap-1.5">
            <KeyIcon className="h-4 w-4" />
            {s.tabs.keys}
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5">
            <DocumentTextIcon className="h-4 w-4" />
            {s.tabs.docs}
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-1.5">
            <ServerStackIcon className="h-4 w-4" />
            {s.tabs.mcp}
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5">
            <ChartBarIcon className="h-4 w-4" />
            {s.tabs.usage}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="docs">
          <ApiDocsTab />
        </TabsContent>
        <TabsContent value="mcp">
          <McpTab />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeveloperHubPage;
