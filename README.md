# socket-file-sync

Watch and sync files from client to server using NodeJS Socket.io.

Simple to configure - doesn't use SSH, just a secret text.

A single server can be connected to from multiple clients.

## Install

Install it both on client and the server:

```sh
npm install socket-file-sync
```

## Usage

```sh
sfs [mode] <[options]>
```

* **`mode`** `[string](required)` One of two:
  * **`server`** **`s`** Host where files are uploaded to
  * **`client`** **`c`** Host where files are uploaded from, and watched for changes

  This can also be provided as as a switch: `--mode server` (instead of the 1st argument)

* **`secret`** `[string](required)` Secret to use for authentication.

**`client`** related options:

* **`cwd`** `[string](default:process.cwd())` Current directory (on client) where files are watched on
* **`server`** `[string](required)` The server address to which the client connects to
* **`serverDir`** `[string](required)` Base dir on the server w.r.t. to which files uploaded are written to

Common to both: These settings are common to both server and client and the roles of remotes are interchangeable - any one can send/receive a file.

* **`twoWay`** `[boolean]` Enable two-way sync - server also watches for and pushes the file changes from its end.

  Note: With this enabled you may see "Skipping copying... Same contents" warnings which are an unfortunate by-product of preventing the file-watchers running on both ends to go in a feedback loop of re-sending the same file over and over again.

  It needs to be **enabled by both** the server and the client.

* **`deleteOnRemote`** `[boolean]` Enable deleting a file on the remote. The remote needs to have **`deleteByRemote`** enabled.

* **`deleteByRemote`** `[boolean]` Enable the remote to delete a local file.

Note: Necessary options are prompted if not provided.

Config is stored in two places:

* **`~/.socket-file-sync`** Main config that applies across all projects

* **`<current-dir>/.socket-file-sync`** An optional per-project config whose values override those in the main one.


### Example

* On Server:

  ```sh
  sfs server
  ```

* On Client:

  ```sh
  sfs client --server my-linode.com --server-dir ~/project
  ```
