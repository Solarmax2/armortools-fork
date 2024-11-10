#pragma once

#include <kinc/global.h>

#include <stdbool.h>

/*! \file vertexstructure.h
    \brief Provides functions for setting up the structure of vertices in a vertex-buffer.
*/

#ifdef __cplusplus
extern "C" {
#endif

typedef enum kinc_g4_vertex_data {
	KINC_G4_VERTEX_DATA_NONE = 0,
	KINC_G4_VERTEX_DATA_F32_1X = 1,
	KINC_G4_VERTEX_DATA_F32_2X = 2,
	KINC_G4_VERTEX_DATA_F32_3X = 3,
	KINC_G4_VERTEX_DATA_F32_4X = 4,
	KINC_G4_VERTEX_DATA_F32_4X4 = 5,
	KINC_G4_VERTEX_DATA_I8_1X = 6,
	KINC_G4_VERTEX_DATA_U8_1X = 7,
	KINC_G4_VERTEX_DATA_I8_1X_NORMALIZED = 8,
	KINC_G4_VERTEX_DATA_U8_1X_NORMALIZED = 9,
	KINC_G4_VERTEX_DATA_I8_2X = 10,
	KINC_G4_VERTEX_DATA_U8_2X = 11,
	KINC_G4_VERTEX_DATA_I8_2X_NORMALIZED = 12,
	KINC_G4_VERTEX_DATA_U8_2X_NORMALIZED = 13,
	KINC_G4_VERTEX_DATA_I8_4X = 14,
	KINC_G4_VERTEX_DATA_U8_4X = 15,
	KINC_G4_VERTEX_DATA_I8_4X_NORMALIZED = 16,
	KINC_G4_VERTEX_DATA_U8_4X_NORMALIZED = 17,
	KINC_G4_VERTEX_DATA_I16_1X = 18,
	KINC_G4_VERTEX_DATA_U16_1X = 19,
	KINC_G4_VERTEX_DATA_I16_1X_NORMALIZED = 20,
	KINC_G4_VERTEX_DATA_U16_1X_NORMALIZED = 21,
	KINC_G4_VERTEX_DATA_I16_2X = 22,
	KINC_G4_VERTEX_DATA_U16_2X = 23,
	KINC_G4_VERTEX_DATA_I16_2X_NORMALIZED = 24,
	KINC_G4_VERTEX_DATA_U16_2X_NORMALIZED = 25,
	KINC_G4_VERTEX_DATA_I16_4X = 26,
	KINC_G4_VERTEX_DATA_U16_4X = 27,
	KINC_G4_VERTEX_DATA_I16_4X_NORMALIZED = 28,
	KINC_G4_VERTEX_DATA_U16_4X_NORMALIZED = 29,
	KINC_G4_VERTEX_DATA_I32_1X = 30,
	KINC_G4_VERTEX_DATA_U32_1X = 31,
	KINC_G4_VERTEX_DATA_I32_2X = 32,
	KINC_G4_VERTEX_DATA_U32_2X = 33,
	KINC_G4_VERTEX_DATA_I32_3X = 34,
	KINC_G4_VERTEX_DATA_U32_3X = 35,
	KINC_G4_VERTEX_DATA_I32_4X = 36,
	KINC_G4_VERTEX_DATA_U32_4X = 37,

	// deprecated
	KINC_G4_VERTEX_DATA_FLOAT1 = KINC_G4_VERTEX_DATA_F32_1X,
	KINC_G4_VERTEX_DATA_FLOAT2 = KINC_G4_VERTEX_DATA_F32_2X,
	KINC_G4_VERTEX_DATA_FLOAT3 = KINC_G4_VERTEX_DATA_F32_3X,
	KINC_G4_VERTEX_DATA_FLOAT4 = KINC_G4_VERTEX_DATA_F32_4X,
	KINC_G4_VERTEX_DATA_FLOAT4X4 = KINC_G4_VERTEX_DATA_F32_4X4,
	KINC_G4_VERTEX_DATA_SHORT2_NORM = KINC_G4_VERTEX_DATA_I16_2X_NORMALIZED,
	KINC_G4_VERTEX_DATA_SHORT4_NORM = KINC_G4_VERTEX_DATA_I16_4X_NORMALIZED,
	KINC_G4_VERTEX_DATA_COLOR = KINC_G4_VERTEX_DATA_U8_4X_NORMALIZED
} kinc_g4_vertex_data_t;

static inline int kinc_g4_vertex_data_size(kinc_g4_vertex_data_t data) {
	switch (data) {
	default:
	case KINC_G4_VERTEX_DATA_NONE:
		return 0;
	case KINC_G4_VERTEX_DATA_F32_1X:
		return 1 * 4;
	case KINC_G4_VERTEX_DATA_F32_2X:
		return 2 * 4;
	case KINC_G4_VERTEX_DATA_F32_3X:
		return 3 * 4;
	case KINC_G4_VERTEX_DATA_F32_4X:
		return 4 * 4;
	case KINC_G4_VERTEX_DATA_F32_4X4:
		return 4 * 4 * 4;
	case KINC_G4_VERTEX_DATA_I8_1X:
	case KINC_G4_VERTEX_DATA_U8_1X:
	case KINC_G4_VERTEX_DATA_I8_1X_NORMALIZED:
	case KINC_G4_VERTEX_DATA_U8_1X_NORMALIZED:
		return 1 * 1;
	case KINC_G4_VERTEX_DATA_I8_2X:
	case KINC_G4_VERTEX_DATA_U8_2X:
	case KINC_G4_VERTEX_DATA_I8_2X_NORMALIZED:
	case KINC_G4_VERTEX_DATA_U8_2X_NORMALIZED:
		return 2 * 1;
	case KINC_G4_VERTEX_DATA_I8_4X:
	case KINC_G4_VERTEX_DATA_U8_4X:
	case KINC_G4_VERTEX_DATA_I8_4X_NORMALIZED:
	case KINC_G4_VERTEX_DATA_U8_4X_NORMALIZED:
		return 4 * 1;
	case KINC_G4_VERTEX_DATA_I16_1X:
	case KINC_G4_VERTEX_DATA_U16_1X:
	case KINC_G4_VERTEX_DATA_I16_1X_NORMALIZED:
	case KINC_G4_VERTEX_DATA_U16_1X_NORMALIZED:
		return 1 * 2;
	case KINC_G4_VERTEX_DATA_I16_2X:
	case KINC_G4_VERTEX_DATA_U16_2X:
	case KINC_G4_VERTEX_DATA_I16_2X_NORMALIZED:
	case KINC_G4_VERTEX_DATA_U16_2X_NORMALIZED:
		return 2 * 2;
	case KINC_G4_VERTEX_DATA_I16_4X:
	case KINC_G4_VERTEX_DATA_U16_4X:
	case KINC_G4_VERTEX_DATA_I16_4X_NORMALIZED:
	case KINC_G4_VERTEX_DATA_U16_4X_NORMALIZED:
		return 4 * 2;
	case KINC_G4_VERTEX_DATA_I32_1X:
	case KINC_G4_VERTEX_DATA_U32_1X:
		return 1 * 4;
	case KINC_G4_VERTEX_DATA_I32_2X:
	case KINC_G4_VERTEX_DATA_U32_2X:
		return 2 * 4;
	case KINC_G4_VERTEX_DATA_I32_3X:
	case KINC_G4_VERTEX_DATA_U32_3X:
		return 3 * 4;
	case KINC_G4_VERTEX_DATA_I32_4X:
	case KINC_G4_VERTEX_DATA_U32_4X:
		return 4 * 4;
	}
}

typedef struct kinc_g4_vertex_element {
	const char *name;
	kinc_g4_vertex_data_t data;
} kinc_g4_vertex_element_t;

#define KINC_G4_MAX_VERTEX_ELEMENTS 16

typedef struct kinc_g4_vertex_structure {
	kinc_g4_vertex_element_t elements[KINC_G4_MAX_VERTEX_ELEMENTS];
	int size;
	bool instanced;
} kinc_g4_vertex_structure_t;

/// <summary>
/// Initializes a vertex-structure.
/// </summary>
/// <param name="structure">The structure to initialize</param>
/// <returns></returns>
void kinc_g4_vertex_structure_init(kinc_g4_vertex_structure_t *structure);

/// <summary>
/// Adds an element to a vertex-structure.
/// </summary>
/// <param name="structure">The structure to add an element to</param>
/// <param name="name">The name to use for the new element</param>
/// <param name="data">The type of data to assign for the new element</param>
/// <returns></returns>
void kinc_g4_vertex_structure_add(kinc_g4_vertex_structure_t *structure, const char *name, kinc_g4_vertex_data_t data);

#ifdef __cplusplus
}
#endif
