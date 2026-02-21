/// International draughts game engine.
///
/// A pure Dart library implementing FMJD International Draughts rules,
/// AI search with alpha-beta pruning, clock management, and Glicko-2 ratings.
library draughts_engine;

export 'src/ai/difficulty.dart';
// AI
export 'src/ai/evaluation.dart';
export 'src/ai/killer_moves.dart';
export 'src/ai/search.dart';
export 'src/ai/transposition_table.dart';
export 'src/ai/zobrist.dart';
// Board topology
export 'src/board/topology.dart';
// Clock
export 'src/clock/clock.dart';
// Engine
export 'src/engine/board_utils.dart';
export 'src/engine/game_engine.dart';
export 'src/engine/move_generator.dart';
// Rating
export 'src/rating/glicko2.dart';
export 'src/types/board.dart';
export 'src/types/game_state.dart';
export 'src/types/move.dart';
export 'src/types/notation.dart';
// Types
export 'src/types/piece.dart';
