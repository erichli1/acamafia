"use client";

import { Button } from "@/components/ui/button";
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { StickyHeader } from "@/components/layout/sticky-header";
import { api } from "@/convex/_generated/api";
import { groups, FRONTENDGROUPS } from "@/lib/types";
import { DUEDATE, TITLE } from "@/lib/config";
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

export default function Home() {
  return (
    <>
      <StickyHeader className="px-4 py-2">
        <div className="flex justify-between items-center">
          {TITLE}
          <SignInAndSignUpButtons />
        </div>
      </StickyHeader>
      <main className="container max-w-2xl flex flex-col gap-8">
        <h1 className="text-4xl font-extrabold my-8 text-center">{TITLE}</h1>
        <Authenticated>
          <SignedInContent />
        </Authenticated>
        <Unauthenticated>
          <p>Click one of the buttons in the top right corner to sign in.</p>
        </Unauthenticated>
      </main>
    </>
  );
}

function SignInAndSignUpButtons() {
  return (
    <div className="flex gap-4">
      <Authenticated>
        <UserButton afterSignOutUrl="#" />
      </Authenticated>
      <Unauthenticated>
        <SignInButton mode="modal">
          <Button variant="ghost">Sign in</Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button>Sign up</Button>
        </SignUpButton>
      </Unauthenticated>
    </div>
  );
}

function SignedInContent() {
  const user = useQuery(api.myFunctions.getUser);
  if (user === undefined) return <Loading />;

  return (
    <>
      {user === null ? (
        <ComperContent />
      ) : (
        <GroupContent group={user.group} admin={user.admin} />
      )}
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
            Please submit your preferences by {DUEDATE}. You must select at
            least one option.
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
      <p>
        If you run into any problems, please contact me at
        ehli@college.harvard.edu
      </p>
    </div>
  );
}

function GroupContent({
  group,
  admin,
}: {
  group: FRONTENDGROUPS;
  admin: boolean;
}) {
  return (
    <>
      <p>Registered with: {group}</p>
    </>
  );
}

function Loading() {
  return <p>Loading...</p>;
}
