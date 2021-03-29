#include <node_api.h>

#include <stdio.h>
#include <time.h>
#include <assert.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>

#include <sys/ipc.h>
#include <sys/time.h>
#include <sys/types.h>
#include <sys/stat.h>

/* Gloabl settings */
#define FIFO_PATH_LEN 66
#define MAX_MSG_LEN 4096
#define FIFO_DEBUG 1

/* Helper Functions */
void throw(const char* message) {
	perror(message);
	exit(EXIT_FAILURE);
}


/* FIFO-based IPC */
int _fifo_server_setup(int uuid) {
	char fifo_path[FIFO_PATH_LEN]="";
	int fifo_fd;
	sprintf(fifo_path, "/tmp/ipc_fifo_server-%d", uuid);
	if (mkfifo(fifo_path, 0666) > 0) {
		throw("Error creating FIFO in server\n");
	}

	/* Open a fifo */
	if ((fifo_fd = open(fifo_path, O_RDONLY)) <0){
		throw("Error opening FIFO in server\n");
	}

	return fifo_fd;
}

int _fifo_client_setup(char* fifo_path) {
	/* It always assume the server is alreay setup */
	int fifo_fd;
	/* Open a fifo */
	if ((fifo_fd = open(fifo_path, O_WRONLY)) <0){
		throw("Error opening FIFO in client\n");
	}
	return fifo_fd;
}

void _fifo_finish(int fifo_fd) {
	close(fifo_fd);
}

int _fifo_read(int fifo_fd, char* buf, int len){
	int i;
	assert(len>0);
	assert(len<=MAX_MSG_LEN);

	i = read(fifo_fd, buf, len);
#if FIFO_DEBUG
	fprintf(stderr, "[%s] read content: %s\n", __func__, buf);
#endif
	return i;
}

int _fifo_write(int fifo_fd, char*buf, int len){
	int i;
	assert(len>0);
	assert(len<=MAX_MSG_LEN);

#if FIFO_DEBUG
	fprintf(stderr, "[%s] write content: %s\n", __func__, buf);
#endif
	i = write(fifo_fd, buf, len);
	return i;
}


/* SHM-based IPC */


/* DMA/RDMA-based IPC */


/* Declare IPC functions to nodejs here */
static napi_value FIFO_server_setup(napi_env env, napi_callback_info info) {
	int fd;
	int uuid;

	/* Get args */
  	napi_status status;

  	size_t argc = 1;
  	napi_value args[1];
  	status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  	assert(status == napi_ok);

  	if (argc < 1) {
  	  napi_throw_type_error(env, NULL, "Wrong number of arguments");
  	  return NULL;
  	}

  	napi_valuetype valuetype0;
  	status = napi_typeof(env, args[0], &valuetype0);
  	assert(status == napi_ok);

	if (valuetype0 != napi_number) {
    		napi_throw_type_error(env, NULL, "Wrong arguments");
    		return NULL;
	}

	status = napi_get_value_int32(env, args[0], &uuid);
	assert(status == napi_ok);

#ifdef FIFO_DEBUG
	fprintf(stderr, "[%s] uuid: %d\n", __func__, uuid);
	//uuid = 0xbeef;
#endif
	fd = _fifo_server_setup(uuid);

  	napi_value ret;
  	status = napi_create_int32(env, fd, &ret);
  	assert(status == napi_ok);

  	return ret;
}


static napi_value Add(napi_env env, napi_callback_info info) {
  napi_status status;

  size_t argc = 2;
  napi_value args[2];
  status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  assert(status == napi_ok);

  if (argc < 2) {
    napi_throw_type_error(env, NULL, "Wrong number of arguments");
    return NULL;
  }

  napi_valuetype valuetype0;
  status = napi_typeof(env, args[0], &valuetype0);
  assert(status == napi_ok);

  napi_valuetype valuetype1;
  status = napi_typeof(env, args[1], &valuetype1);
  assert(status == napi_ok);

  if (valuetype0 != napi_number || valuetype1 != napi_number) {
    napi_throw_type_error(env, NULL, "Wrong arguments");
    return NULL;
  }

  double value0;
  status = napi_get_value_double(env, args[0], &value0);
  assert(status == napi_ok);

  double value1;
  status = napi_get_value_double(env, args[1], &value1);
  assert(status == napi_ok);

  napi_value sum;
  status = napi_create_double(env, value0 + value1, &sum);
  assert(status == napi_ok);

  return sum;
}

#define DECLARE_NAPI_METHOD(name, func)                                        \
  { name, 0, func, 0, 0, 0, napi_default, 0 }

napi_value Init(napi_env env, napi_value exports) {
  napi_status status;
  /* Demo: Add */
  napi_property_descriptor addDescriptor = DECLARE_NAPI_METHOD("add", Add);
  status = napi_define_properties(env, exports, 1, &addDescriptor);
  assert(status == napi_ok);

  /* FIFO */
  napi_property_descriptor fifoServerSetupDescriptor = DECLARE_NAPI_METHOD("fifo_server_setup", FIFO_server_setup);
  status = napi_define_properties(env, exports, 2, &fifoServerSetupDescriptor);
  assert(status == napi_ok);

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
