import "./SubDebug.css";
import { useState } from "react";

import useRelayState from "Feed/RelayState";
import Tabs, { Tab } from "Element/Tabs";
import { unwrap } from "SnortUtils";
import useSystemState from "Hooks/useSystemState";
import { ReqFilter } from "@snort/system";
import { useCopy } from "useCopy";
import { System } from "index";

function RelayInfo({ id }: { id: string }) {
  const state = useRelayState(id);
  return <div key={id}>{state?.connected ? <>{id}</> : <s>{id}</s>}</div>;
}

function Queries() {
  const qs = useSystemState();
  const { copy } = useCopy();

  function countElements(filters: Array<ReqFilter>) {
    let total = 0;
    for (const f of filters) {
      for (const v of Object.values(f)) {
        if (Array.isArray(v)) {
          total += v.length;
        }
      }
    }
    return total;
  }

  function queryInfo(q: { id: string; filters: Array<ReqFilter>; subFilters: Array<ReqFilter> }) {
    return (
      <div key={q.id}>
        {q.id}
        <br />
        <span onClick={() => copy(JSON.stringify(q.filters))} className="pointer">
          &nbsp; Filters: {q.filters.length} ({countElements(q.filters)} elements)
        </span>
        <br />
        <span onClick={() => copy(JSON.stringify(q.subFilters))} className="pointer">
          &nbsp; SubQueries: {q.subFilters.length} ({countElements(q.subFilters)} elements)
        </span>
      </div>
    );
  }

  return (
    <>
      <b>Queries</b>
      {qs?.queries.map(v => queryInfo(v))}
    </>
  );
}

const SubDebug = () => {
  const [onTab, setTab] = useState(0);

  function connections() {
    return (
      <>
        <b>Connections:</b>
        {System.Sockets.map(k => (
          <RelayInfo id={k.address} />
        ))}
      </>
    );
  }

  const tabs: Tab[] = [
    {
      text: "Connections",
      value: 0,
    },
    {
      text: "Queries",
      value: 1,
    },
  ];

  return (
    <div className="sub-debug">
      <Tabs tabs={tabs} setTab={v => setTab(v.value)} tab={unwrap(tabs.find(a => a.value === onTab))} />
      {(() => {
        switch (onTab) {
          case 0:
            return connections();
          case 1:
            return <Queries />;
          default:
            return null;
        }
      })()}
    </div>
  );
};

export default SubDebug;
