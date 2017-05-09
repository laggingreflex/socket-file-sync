# socket-file-sync

Watch and sync files ultra fast from client to server using NodeJS Socket.io and Streams.

Much faster than SCP, FTP, SFTP in watch mode.

Simple to configure - doesn't use SSH, just a secret text.

A single server can be connected to from multiple clients.

**WARNING** Alpha software. May have security risks. Reviews/PRs/feedback highly welcome.

## Install

Install it both on client and the server:

```sh
npm install socket-file-sync
```

## Usage

```sh
sfs [mode] <[options]>
```

* **`mode`** One of two:
  * **`server`** Host where files are uploaded to
  * **`client`** Host where files are uploaded from, and watched for changes

Options/switches:

Note: Necessary options are prompted if not provided.

* **`mode`** Same as above, but provided as a switch: `--mode server` (instead of 1st argument)
* **`cwd`** (for client) Current directory (on client) where files are watched on
* **`server`** The server address to which the client connects to
* **`serverDir`** Base dir on the server w.r.t. to which files uploaded are written to
* **`secret`** Secret to use for authentication. Stored as a salted hash.


### Example

* On Server:

  ```sh
  sfs server
  ```

* On Client:

  ```sh
  sfs client --server my-linode.com --server-dir /home/me/project
  ```

