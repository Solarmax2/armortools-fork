#pragma once

#ifndef KINC_ANDROID

#include "MiniVulkan.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
	VkPipeline pipeline;
	VkPipelineLayout pipeline_layout;
	VkDescriptorSet descriptor_set;
	VkDescriptorSetLayout descriptor_set_layout;
	VkBuffer raygen_shader_binding_table;
	VkBuffer miss_shader_binding_table;
	VkBuffer hit_shader_binding_table;
} kinc_raytrace_pipeline_impl_t;

typedef struct {
	VkAccelerationStructureKHR top_level_acceleration_structure;
	VkAccelerationStructureKHR bottom_level_acceleration_structure[64];
	uint64_t top_level_acceleration_structure_handle;
	uint64_t bottom_level_acceleration_structure_handle[64];

	VkBuffer bottom_level_buffer[64];
	VkDeviceMemory bottom_level_mem[64];
	VkBuffer top_level_buffer;
	VkDeviceMemory top_level_mem;
	VkBuffer instances_buffer;
	VkDeviceMemory instances_mem;

} kinc_raytrace_acceleration_structure_impl_t;

#ifdef __cplusplus
}
#endif

#endif
