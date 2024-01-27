## TLDR
Webapp where a cappella auditionees can rank their group preferences and groups can easily accept/reject candidates.

## Problem
In the final night of a cappella auditions, many groups are deciding between many candidates. Usually, this requires two whole other groups to manage (ie: tracking which groups accept who, what preferences auditionees have, communicating that outwards) which results in a high-touch and time-intensive process.

## Solution
This app allows auditionees to rank groups in the app as well as for groups to accept/reject candidates. Then, depending on the ordering of the auditionees' preferences, groups would also be notified when a candidate is matched to another group (potentially saving lots of deliberation time).

## Setup
`npm i` installs the necessary packages and `npm run dev` runs the app locally. Note this project is built on top of [Convex](https://www.convex.dev/) and running locally or deploying it would require an account there.

## Misc
I tried to build this project in a relatively extensible way. Adding more groups should only require changing `groups` in `lib/types` and `BACKENDGROUPS` in `convex/schema`.