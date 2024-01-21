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
  const addComper = useMutation(api.myFunctions.addComper);

  const { user } = useUser();

  const [error, setError] = useState<"duplicate" | "nochoices" | "">("");

  const [preferredName, setPreferredName] = useState<string>(
    user?.fullName ?? ""
  );
  const initialState = Array.from({ length: groups.length }, () => null);
  const [choices, setChoices] = useState<{
    [key: number]: FRONTENDGROUPS | null;
  }>(initialState);

  const updateChoice = (index: number, newValue: FRONTENDGROUPS | null) => {
    setError("");
    setChoices((prevChoices) => ({
      ...prevChoices,
      [index]: newValue,
    }));
  };

  if (user === undefined || comperAlreadyExists === undefined)
    return <Loading />;
  if (user === null) return <p>An error occurred</p>;

  const rank = Object.values(choices).filter(notEmpty);

  return (
    <div className="flex flex-col gap-4">
      {comperAlreadyExists === false ? (
        <>
          <p>
            Please submit your preferences by {config.DUEDATE}. You must select
            at least one option.
          </p>
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
          {groups.map((_, groupIndex) => {
            return (
              <div key={`select-${groupIndex}`}>
                <p className="text-sm mb-1">Choice {groupIndex + 1}</p>
                <Select
                  onValueChange={(value) => {
                    const groupValue =
                      groups.find((group) => group === value) ?? null;
                    updateChoice(groupIndex, groupValue);
                  }}
                >
                  <SelectTrigger className="w-2/3">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={""}>N/A</SelectItem>
                      {groups.map((group, itemIndex) => (
                        <SelectItem
                          key={`select-${groupIndex}-item-${itemIndex}`}
                          value={group}
                        >
                          {group}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          <div>
            <Button
              onClick={() => {
                if (rank.length !== new Set(rank).size) setError("duplicate");
                else
                  addComper({
                    preferredName: preferredName,
                    originalRanking: rank,
                  }).catch(console.error);
              }}
              disabled={preferredName === "" || rank.length === 0}
            >
              Submit
            </Button>
          </div>
          {error === "duplicate" && (
            <Alert variant="destructive">
              Please remove any duplicate choices! Your ranking is currently{" "}
              {rank.join(", ")}
            </Alert>
          )}
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
          </ul>
        </>
      )}
    </div>
  );
}

function GroupContent({ group }: { group: FRONTENDGROUPS }) {
  const compers = useQuery(api.myFunctions.getCompers);
  const updates = useQuery(api.myFunctions.getUpdates);
  const decideComper = useMutation(api.myFunctions.decideComper);

  if (compers === undefined || updates === undefined) return <Loading />;

  type Comper = (typeof api.myFunctions.getCompers)["_returnType"][0];

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
        const { decision, id, preferredName, matched } = row.original;
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
                            comperId: id,
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
                            comperId: id,
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
      <DataTable columns={columns} data={compers} />
      <p className="text-lg font-bold">Your new members</p>
      <ol className="list-disc ml-8">
        {compers
          .filter((comper) => comper.matchedGroup === group)
          .map((comper) => (
            <li key={comper.id}>
              {comper.preferredName} | {comper.email}
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
