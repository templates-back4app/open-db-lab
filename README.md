# open-db-lab

[![Deploy on Back4app](https://img.shields.io/badge/Deploy%20on-Back4app-1568B8?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEyIDJMMiA3djEwbDEwIDUgMTAtNVY3eiIvPjwvc3ZnPg==)](https://www.back4app.com/signup?utm_source=github&utm_medium=repo&utm_campaign=open-db-lab)

What permissions does a brand-new database table arrive with, and what can a
stranger do with it? This stands up a backend, creates a table the two different
ways tables get created, and asks — holding nothing but the **app id that ships
inside every front-end bundle** — what it is allowed to do.

Every answer is a performed request, never a reading of configuration.

**Measured on Parse Server 7.4.0 with MongoDB 7, Docker 29.4.3, 29 October 2026.
Identical across two consecutive clean runs.**

> **Read the article:** [Your Database Is Open to Anyone Until You Close It: What a New Table Actually Allows](https://www.back4app.com/blog/database-permissions-open-by-default?utm_source=github&utm_medium=repo&utm_campaign=open-db-lab)

## Run it

```
./run.sh
```

Needs Docker and Node 22. The backend is destroyed and rebuilt every run, so
nothing here touches anything of yours.

## What it found

| the table | what the permissions say | what a stranger actually got |
| --- | --- | --- |
| `Patient` — created with only the app id | 7 of 7 open to everyone | all 5 rows, added, edited ours, deleted ours |
| `Invoice` — declared with the master key | 7 of 7 open to everyone | all 3 rows, added, edited ours, deleted ours |
| `_User` — came with the backend | 7 of 7 open to everyone | 0 rows, refused, refused, refused |

**How the table was created made no difference.** The one a coding agent would
create by writing to a name that does not exist yet, and the one declared through
the schema API with the master key, arrived in the same state.

### The users table is the interesting row

Its permissions report exactly the same seven operations open to everyone, and it
refuses anyway:

```
a stranger lists accounts:  0 row(s)
a stranger fetches one:     no — Object not found.
a stranger edits one:       no — Cannot modify user X.
a stranger deletes one:     no — Insufficient auth to delete user
```

That guard is special-cased in the server, not expressed in the permissions. **No
table you create inherits it** — so checking the users table and concluding the
permissions screen is decorative is exactly the wrong lesson.

## What closing it costs

| | before | after |
| --- | --- | --- |
| operations open to everyone | 7 of 7 | 0 of 7 |
| a stranger reads your rows | every row | refused |
| a stranger adds a row | yes | no |
| a stranger edits a row that is not theirs | yes | no |
| a stranger deletes a row that is not theirs | yes | no |
| a stranger invents a new table | yes | no |
| a signed-in user reads her own account | yes | **yes** |

That last row is the check that matters, because zero findings is also what a
completely broken app reports. What stops working is the browser writing to the
database directly: every such write has to move into a server-side function that
checks who is calling.

## The pieces

| file | what it does |
| --- | --- |
| `seed.mjs` | creates the two tables the two ways, and puts somebody else's data in them |
| `probe.mjs` | the six questions, asked against rows that are unambiguously not yours |
| `measure.mjs` | runs the questions and prints what came back |
| `harden.mjs` | denies everything, then reopens reads for signed-in users only |
| `client.mjs` | the two ways to call the backend: as a stranger, and as the owner |

Point `client.mjs` at your own backend and the same questions run against it. The
probes only delete rows they created themselves, and put back anything they change.
