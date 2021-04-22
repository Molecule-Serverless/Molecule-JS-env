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
#include <errno.h>
/* Gloabl settings */
#define FIFO_PATH_LEN 66
#define MAX_MSG_LEN 4096
// #define FIFO_DEBUG 1
//#define FIFO_PATH_TEMPLATE "/tmp/ipc_fifo_server-%d"
#undef FIFO_PATH_TEMPLATE
// #ifndef FIFO_PATH_TEMPLATE
#define FIFO_PATH_TEMPLATE "/tmp/fifo_dir/ipc_fifo_id-%d"
// #endif
/*Dd: add for smartcomputers */
#include <global_syscall_protocol.h>
#include <global_syscall_interfaces.h>
#include <chos/errno.h>

//FIXME: caution! : in the nodejs napi, fifo_read using local _fifo_read while fifo_write using global_fifo_write
/* Helper Functions */
void addon_throw(const char* message) {
	perror(message);
	exit(EXIT_FAILURE);
}


/*create a global fifo for other functions to write, when the container start up, should init this fifo  */
int _fifo_ipc_init(int uuid)
{
	char fifo_path[FIFO_PATH_LEN] = "";
	sprintf(fifo_path, FIFO_PATH_TEMPLATE, uuid);
	if(mkfifo(fifo_path, 0666) > 0)
	{
		addon_throw("Error when fifo init\n");
	}
	int read_fifo_fd;
	printf("_fifo_ipc_init before open\n");
	if((read_fifo_fd = open(fifo_path, O_RDWR)) < 0)
	{
		addon_throw("Error opening FIFO for read when fifo init\n");
	}
	printf("_fifo_ipc_init after open\n");
#ifdef FIFO_DEBUG
	fprintf(stderr, "[%s] uuid: %d, fd: %d\n", __func__, uuid,read_fifo_fd);
#endif
	return read_fifo_fd;
}



/*open the global fifo of others to  write request parameter or return value */
int _fifo_ipc_connect(int uuid)
{
	char fifo_path[FIFO_PATH_LEN] = "";
	sprintf(fifo_path, FIFO_PATH_TEMPLATE, uuid);
	int write_fifo_fd;
	printf("ipc_connect fifo_path: %s\n",fifo_path);
	while((write_fifo_fd = open(fifo_path, O_WRONLY)) < 0)
	{
		printf("errno: %d\n", errno);
		if(errno == ENOENT)
		{
			sleep(1);
		}
		// throw("Error ipc connect when open the fifo of the callee\n");
	}
#ifdef FIFO_DEBUG
	fprintf(stderr, "[%s] uuid: %d\n", __func__, uuid);
#endif
	return write_fifo_fd;
}

/* FIFO-based IPC */
int _fifo_client_setup(int uuid) {
	char fifo_path[FIFO_PATH_LEN]="";
	int fifo_fd;
	sprintf(fifo_path, FIFO_PATH_TEMPLATE, uuid);
	if (mkfifo(fifo_path, 0666) > 0) {
		addon_throw("Error creating FIFO in server\n");
	}

	/* Open a fifo */
	if ((fifo_fd = open(fifo_path, O_WRONLY)) <0){
		addon_throw("Error opening FIFO in server\n");
	}

	return fifo_fd;
}

//int _fifo_server_setup(char* fifo_path) {
int _fifo_server_setup(int uuid) {
	char fifo_path[FIFO_PATH_LEN]="";
	/* It always assume the client is alreay setup */
	int fifo_fd;

	sprintf(fifo_path, FIFO_PATH_TEMPLATE, uuid);

	/* Open a fifo */
	if ((fifo_fd = open(fifo_path, O_RDONLY)) <0){
		addon_throw("Error opening FIFO in client\n");
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
	// while(i < 0)
	// {
	// 	i = read(fifo_fd, buf, len);
	// }
#if FIFO_DEBUG
	fprintf(stderr, "[%s] read content: %s， read size: %d\n", __func__, buf, i);
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

static napi_value FIFO_ipc_init(napi_env env, napi_callback_info info)
{
	int fd;
	int uuid;
	int global_fifo;

	napi_status status;
	size_t argc = 1;
	napi_value args[1];
	status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
	assert(status == napi_ok);

	if(argc < 1)
	{
		napi_throw_type_error(env, NULL, "Wrong number of arguments");
		return NULL;
	}
	napi_valuetype valuetype0;
	status = napi_typeof(env, args[0], &valuetype0);
	assert(status == napi_ok);

	if(valuetype0 != napi_number)
	{
		napi_throw_type_error(env, NULL, "Wrong argument type");
		return NULL;
	}
	status = napi_get_value_int32(env, args[0], &uuid);
	assert(status == napi_ok);

#ifdef FIFO_DEBUG
	fprintf(stderr, "[%s] uuid: %d\n", __func__, uuid);
#endif
	fd = _fifo_ipc_init(uuid);

	//Dd: add for smartcomputers
	global_fifo = global_fifo_init_uuid(uuid,uuid); //register localFIFO to global

	napi_value ret;
	//status = napi_create_int32(env, fd, &ret);
	status = napi_create_int32(env, fd, &ret);
	assert(status == napi_ok);

	return ret;
}

static napi_value addon_register_self_global(napi_env env, napi_callback_info info)
{
	int fd;
	int uuid;
	int global_fifo;

	napi_status status;
	size_t argc = 1;

	//Dd: add for smartcomputers
	register_self_global(GLOBAL_OS_PORT); //server always use the default globalOS

	napi_value ret;
	//status = napi_create_int32(env, fd, &ret);
	status = napi_create_int32(env, 0, &ret);
	assert(status == napi_ok);

	return ret;
}


static napi_value FIFO_ipc_connect(napi_env env, napi_callback_info info)
{
	int fd;
	int uuid;
	napi_status status;
	size_t argc = 1;
	napi_value args[1];
	status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
	assert(status == napi_ok);

	if(argc < 1)
	{
		napi_throw_type_error(env, NULL, "Wrong number of argument\n");
		return NULL;
	}

	napi_valuetype valuetype0;
	status = napi_typeof(env, args[0], &valuetype0);
	assert(status == napi_ok);

	if(valuetype0 != napi_number)
	{
		napi_throw_type_error(env, NULL, "Wrong argument type\n");
		return NULL;
	}

	status = napi_get_value_int32(env, args[0], &uuid);
	assert(status == napi_ok);
#ifdef FIFO_DEBUG
	fprintf(stderr, "[%s] uuid: %d\n", __func__, uuid);
#endif

	// fd =_fifo_ipc_connect(uuid);
	fd = global_fifo_connect(uuid);
	int retry_time = 60;
	while(retry_time && fd == -1)
	{
		sleep(1);
		fd = global_fifo_connect(uuid);
	}
	if(fd == -1)
	{
		fprintf(stderr, "global_fifo_connect failed, retry 60 times, uuid: %d\n", uuid);
	}
	napi_value ret;
	status = napi_create_int32(env, fd, &ret);
	assert(status == napi_ok);
	return ret;

}

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



//FIXME: some codes of client/serer setup could be merged into a common func
static napi_value FIFO_client_setup(napi_env env, napi_callback_info info) {
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
	fd = _fifo_client_setup(uuid);

  	napi_value ret;
  	status = napi_create_int32(env, fd, &ret);
  	assert(status == napi_ok);

  	return ret;
}

static napi_value FIFO_write(napi_env env, napi_callback_info info) {
	int fd;
	char buf[MAX_MSG_LEN];
	size_t bufsize = MAX_MSG_LEN;
	size_t result;

	/* Get args */
  	napi_status status;

  	size_t argc = 2;
  	napi_value args[2];
  	status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  	assert(status == napi_ok);

  	if (argc < 2) {
  	  napi_throw_type_error(env, NULL, "Wrong number of arguments");
  	  return NULL;
  	}

	status = napi_get_value_int32(env, args[0], &fd);
	assert(status == napi_ok);

	status = napi_get_value_string_utf8(env, args[1], buf, bufsize, &result);
	buf[result] = '\0';
	result += 1;
	assert(status == napi_ok);
	assert(result <= bufsize);

#ifdef FIFO_DEBUG
	fprintf(stderr, "[%s] result size: %d\n", __func__, result);
	fprintf(stderr, "[%s] buf writeen: %s\n", __func__, buf);
	//uuid = 0xbeef;
#endif
	// result = _fifo_write(fd, buf, result);
	printf("before global fifo write, buf: %s, result: %d, strlen: %d\n", buf, result, strlen(buf));
	result = global_fifo_write(fd, buf, result);
	printf("global fifo write result: %d, buf: %s >\n", result, buf);

  	napi_value ret;
  	status = napi_create_int32(env, result, &ret);
  	assert(status == napi_ok);

  	return ret;
}

static napi_value FIFO_read(napi_env env, napi_callback_info info) {
	int fd;
	char buf[MAX_MSG_LEN] = {0};
	size_t bufsize = MAX_MSG_LEN;
	size_t result;

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

	status = napi_get_value_int32(env, args[0], &fd);
	assert(status == napi_ok);

	result = _fifo_read(fd, buf, bufsize);
	printf("fifo_read result: %d, buf: %s >\n", result, buf);
	// //FIXME: fifo read just using local _fifo_read rather than global_fifo_read?
	// result = global_fifo_read(fd, buf, bufsize);
	// if(result == -EFIFOLOCAL)
	// {
	// 	result = _fifo_read()
	// }
	assert(result <= bufsize);

#ifdef FIFO_DEBUG
	fprintf(stderr, "[%s] result size: %d\n", __func__, result);
	fprintf(stderr, "[%s] buf readed: %s\n", __func__, buf);
	//uuid = 0xbeef;
#endif

  	napi_value ret;
  	status = napi_create_string_utf8(env, buf, result, &ret);
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
  napi_property_descriptor IPCDescriptors[] = {
  	DECLARE_NAPI_METHOD("add", Add), //demo: add
	DECLARE_NAPI_METHOD("fifo_server_setup", FIFO_server_setup), //fifo: server_setup
	DECLARE_NAPI_METHOD("fifo_client_setup", FIFO_client_setup), //fifo: client_setup
	DECLARE_NAPI_METHOD("fifo_read", FIFO_read), //fifo: read
	DECLARE_NAPI_METHOD("fifo_write", FIFO_write),  //fifo: write
	DECLARE_NAPI_METHOD("fifo_ipc_init", FIFO_ipc_init),
	DECLARE_NAPI_METHOD("register_self_global", addon_register_self_global),
	DECLARE_NAPI_METHOD("fifo_ipc_connect", FIFO_ipc_connect)
  };
  status = napi_define_properties(env, exports,
		  sizeof(IPCDescriptors) / sizeof(IPCDescriptors[0]), &IPCDescriptors);
  assert(status == napi_ok);
#if 0
  /* Demo: Add */
  napi_property_descriptor addDescriptor = DECLARE_NAPI_METHOD("add", Add);
  status = napi_define_properties(env, exports, 1, &addDescriptor);
  assert(status == napi_ok);

  /* FIFO */
  napi_property_descriptor fifoServerSetupDescriptor = DECLARE_NAPI_METHOD("fifo_server_setup", FIFO_server_setup);
  status = napi_define_properties(env, exports, 2, &fifoServerSetupDescriptor);
  assert(status == napi_ok);

  napi_property_descriptor fifoClientSetupDescriptor = DECLARE_NAPI_METHOD("fifo_client_setup", FIFO_client_setup);
  status = napi_define_properties(env, exports, 3, &fifoClientSetupDescriptor);
  assert(status == napi_ok);
#endif

  /*
  napi_property_descriptor fifoReadDescriptor = DECLARE_NAPI_METHOD("fifo_read", FIFO_read);
  status = napi_define_properties(env, exports, 4, &fifoReadDescriptor);
  assert(status == napi_ok);

  napi_property_descriptor fifoWriteDescriptor = DECLARE_NAPI_METHOD("fifo_write", FIFO_write);
  status = napi_define_properties(env, exports, 5, &fifoWriteDescriptor);
  assert(status == napi_ok);
  */

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
