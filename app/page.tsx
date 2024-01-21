"use client";

import { Button } from "@/components/ui/button";
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { StickyHeader } from "@/components/layout/sticky-header";
import { api } from "@/convex/_generated/api";
import { groups, FRONTENDGROUPS } from "@/lib/types";
import { config } from "@/lib/config";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notEmpty } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

export default function Home() {
  return (
    <>
      <StickyHeader className="px-4 py-2">
        <div className="flex justify-between items-center">
          {config.TITLE}
          <HeaderButtons />
        </div>
      </StickyHeader>
      <main className="container max-w-2xl flex flex-col gap-8">
        <h1 className="text-4xl font-extrabold my-8 text-center">
          {config.TITLE}
        </h1>
        <Authenticated>
          <SignedInContent />
        </Authenticated>
        <Unauthenticated>
          <p>{config.AUDITIONEE_DESCRIPTION}</p>
        </Unauthenticated>
        <Separator />
        <p>
          If you run into any problems, please contact me at
          ehli@college.harvard.edu
        </p>
      </main>
    </>
  );
}

function HeaderButtons() {
  return (
    <div className="flex gap-4">
      <Authenticated>
        <UserButton afterSignOutUrl="#" />
      </Authenticated>
      <Unauthenticated>
        <SignInButton mode="modal">
          <Button>Sign in</Button>
        </SignInButton>
      </Unauthenticated>
    </div>
  );
}

function SignedInContent() {
  const user = useQuery(api.myFunctions.getUser);
  if (user === undefined) return <Loading />;

  return (
    <>
      {user === null ? <ComperContent /> : <GroupContent group={user.group} />}
    </>
  );
}

function ComperContent() {
  const comperAlreadyExists = useQuery(api.myFunctions.comperAlreadyExists);
  const { user } = useUser();

  const initialGroups = Array.from({ length: groups.length }, () => false);
  const [possibleGroups, setPossibleGroups] = useState<{
    [key: number]: boolean;
  }>(initialGroups);
  const updatePossibleGroup = (index: number) => {
    setPossibleGroups((prevGroups) => ({
      ...prevGroups,
      [index]: !prevGroups[index],
    }));
  };
  const possibleGroupsAsNames = Object.values(possibleGroups)
    .map((possible, index) => (possible ? groups[index] : null))
    .filter(notEmpty);

  if (user === undefined || comperAlreadyExists === undefined)
    return <Loading />;
  if (user === null) return <p>An error occurred</p>;

  return (
    <div className="flex flex-col gap-4">
      {comperAlreadyExists === false ? (
        <>
          <p>Which groups are you in the process with?</p>
          <div className="flex flex-col gap-2">
            {groups.map((group, initialGroupIndex) => (
              <div
                className="flex items-center space-x-2"
                key={`select-intl-group-${initialGroupIndex}`}
              >
                <Checkbox
                  id="terms"
                  checked={possibleGroups[initialGroupIndex]}
                  onCheckedChange={() => {
                    updatePossibleGroup(initialGroupIndex);
                  }}
                />
                <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {group}
                </label>
              </div>
            ))}
          </div>
          <p>{config.PREFERENCES_DESCRIPTION}</p>
          <DecideOnGroups
            // Re-render component when changes made
            key={`${possibleGroupsAsNames.join("-")}-${user.fullName ?? ""}`}
            possibleGroups={possibleGroupsAsNames}
            initialName={user.fullName ?? ""}
          />
        </>
      ) : (
        <>
          <p>
            Thanks for submitting your preferences! Here&apos;s what we
            received:
          </p>
          <ul className="list-disc ml-8">
            <li>Preferred name: {comperAlreadyExists.preferredName}</li>
            <li>
              Group rankings (in order):{" "}
              {comperAlreadyExists.ranking.join(", ")}
            </li>
            <li>Unranked groups: {comperAlreadyExists.unranked.join(", ")}</li>
          </ul>
        </>
      )}
    </div>
  );
}

function DecideOnGroups({
  possibleGroups,
  initialName,
}: {
  possibleGroups: FRONTENDGROUPS[];
  initialName: string;
}) {
  const addComper = useMutation(api.myFunctions.addComper);

  const [preferredName, setPreferredName] = useState<string>(initialName);

  const initialState = Array.from({ length: possibleGroups.length }, () => -1);
  const [choices, setChoices] = useState<{
    [key: number]: number;
  }>(initialState);
  const updateChoice = (index: number, newValue: number) => {
    setChoices((prevChoices) => ({
      ...prevChoices,
      [index]: newValue,
    }));
  };

  const choicesArray = Object.values(choices);
  const rawRank: Array<FRONTENDGROUPS | null> = Array.from(
    { length: possibleGroups.length + 1 },
    () => null
  );
  const unranked: Array<FRONTENDGROUPS> = [];

  choicesArray.forEach((choiceVal, groupIndex) => {
    if (choiceVal === 0) unranked.push(possibleGroups[groupIndex]);
    else rawRank[choiceVal] = possibleGroups[groupIndex];
  });
  const ranked = rawRank.filter(notEmpty);

  return (
    <>
      <div>
        <p className="text-sm mb-1">Preferred name</p>
        <Input
          value={preferredName}
          onChange={(e) => {
            setPreferredName(e.target.value);
          }}
          className="w-2/3"
        />
      </div>
      {possibleGroups.map((possibleGroup, groupIndex) => {
        return (
          <div key={`decide-${groupIndex}`}>
            <p className="text-sm mb-1">{possibleGroup}</p>
            <Select
              onValueChange={(value) => {
                updateChoice(groupIndex, parseInt(value));
              }}
            >
              <SelectTrigger className="w-2/3">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={"0"}>Do not rank</SelectItem>
                  {possibleGroups.map((_, itemIndex) => (
                    <SelectItem
                      key={`select-${groupIndex}-item-${itemIndex}`}
                      value={`${itemIndex + 1}`}
                    >
                      Rank {itemIndex + 1}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        );
      })}
      <div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={
                preferredName === "" ||
                choicesArray.length === 0 ||
                choicesArray.some((choice) => choice === -1) ||
                choicesArray.filter((choice) => choice !== 0).length !==
                  new Set(choicesArray.filter((choice) => choice !== 0)).size
              }
            >
              Submit
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to submit?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to submit these preferences? This action
                cannot be undone. Please confirm the following:
                <br />
                <br /> Preferred Name: {preferredName}
                <br /> Ranked groups (in order): {ranked.join(", ")}
                <br />
                {unranked.length > 0 &&
                  `Unranked groups: ${unranked.join(", ")}`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  addComper({
                    preferredName: preferredName,
                    rank: ranked,
                    unranked,
                  }).catch(console.error);
                }}
              >
                Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

function GroupContent({ group }: { group: FRONTENDGROUPS }) {
  const compers = useQuery(api.myFunctions.getCompers);
  const updates = useQuery(api.myFunctions.getUpdates);
  const decideComper = useMutation(api.myFunctions.decideComper);

  if (compers === undefined || updates === undefined) return <Loading />;

  const matchedCompersToUs = compers.ranked.filter(
    (comper) => comper.matchedGroup === group
  );

  type Comper = (typeof api.myFunctions.getCompers)["_returnType"]["ranked"][0];

  const columns: ColumnDef<Comper>[] = [
    {
      accessorKey: "preferredName",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorFn: (comper) =>
        comper.matched ? comper.matchedGroup : "Not yet!",
      header: "Matched?",
    },
    {
      accessorKey: "decision",
      header: "Decision",
      cell: ({ row }) => {
        const { decision, _id, preferredName, matched } = row.original;
        if (decision !== null) return decision ? "Accepted" : "Rejected";

        return (
          <div className="flex flex-row gap-1">
            {matched ? (
              <p>Already matched.</p>
            ) : (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-green-700 hover:bg-green-800"
                    >
                      Accept
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Accept {preferredName}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to accept this auditionee? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          decideComper({
                            comperId: _id,
                            status: true,
                          }).catch(console.error);
                        }}
                        className="bg-green-700 hover:bg-green-800"
                      >
                        Accept
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" className="bg-red-700 hover:bg-red-800">
                      Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Reject {preferredName}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reject this auditionee? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          decideComper({
                            comperId: _id,
                            status: false,
                          }).catch(console.error);
                        }}
                        className="bg-red-700 hover:bg-red-800"
                      >
                        Reject
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-bold">{group}</p>
      <DataTable columns={columns} data={compers.ranked} />
      {compers.unranked.length > 0 && (
        <>
          <p className="text-lg font-bold">Auditionees that did not rank</p>
          <ol className="list-disc ml-8">
            {compers.unranked.map((comper) => (
              <li key={comper._id}>
                {comper.preferredName}, {comper.email}
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="text-lg font-bold">Your new members</p>
      {matchedCompersToUs.length === 0 && <p>No new members yet.</p>}
      <ol className="list-disc ml-8">
        {matchedCompersToUs.map((comper) => (
          <li key={comper._id}>
            {comper.preferredName}, {comper.email}
          </li>
        ))}
      </ol>
      <p className="text-lg font-bold">Update feed (newest first)</p>
      <div className="flex flex-col gap-2">
        {updates.reverse().map((update) => (
          <Alert key={update._id}>
            <div>
              <span className="font-bold">
                {new Date(update._creationTime).toLocaleString()}:{" "}
              </span>
              <span>
                {update.group === "None"
                  ? `${update.name} (${update.email}) did not match with a group`
                  : `${update.name} (${update.email}) matched to ${update.group}`}
              </span>
            </div>
          </Alert>
        ))}
        {updates.length === 0 && <p>No updates yet.</p>}
      </div>
    </div>
  );
}

function Loading() {
  return <p>Loading...</p>;
}
