/**
 * ownCloud - Music app
 *
 * @author Morris Jobke
 * @copyright 2013 Morris Jobke <morris.jobke@gmail.com>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU AFFERO GENERAL PUBLIC LICENSE
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU AFFERO GENERAL PUBLIC LICENSE for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this library.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

angular.module('Music').service('playlistService', ['$rootScope', function($rootScope) {
	var playlist = null;
	var playOrder = [];
	var playOrderIter = -1;
	var startFromIndex = null;
	var prevShuffleState = false;

	function shuffledIndices() {
		var indices = _.range(playlist.length);
		return _.shuffle(indices);
	}

	function shuffledIndicesExcluding(toExclude) {
		var indices = _.range(playlist.length);
		indices.splice(toExclude, 1);
		return _.shuffle(indices);
	}

	function wrapIndexToStart(list, index) {
		if (index > 0) {
			// slice array in two parts and interchange them
			var begin = list.slice(0, index);
			var end = list.slice(index);
			list = end.concat(begin);
		}
		return list;
	}

	function initPlayOrder(shuffle) {
		if (shuffle) {
			if (startFromIndex !== null) {
				playOrder = [startFromIndex].concat(shuffledIndicesExcluding(startFromIndex));
			} else {
				playOrder = shuffledIndices();
			}
		}
		else {
			playOrder = _.range(playlist.length);
			if (startFromIndex !== null) {
				playOrder = wrapIndexToStart(playOrder, startFromIndex);
			}
		}
		prevShuffleState = shuffle;
	}

	function enqueueIndices(shuffle) {
		var prevIndex = _.last(playOrder);
		var nextIndices = null;

		// Append playlist indices in suitable order, excluding the previously played index
		// to prevent the same track from playing twice in row. Playlist containing only a
		// single track is a special case as there we cannot exclude our only track.
		if (playlist.length === 1) {
			nextIndices = [0];
		} else if (shuffle) {
			nextIndices = shuffledIndicesExcluding(prevIndex);
		} else {
			nextIndices = wrapIndexToStart(_.range(playlist.length), prevIndex);
			nextIndices = _.rest(nextIndices);
		}

		playOrder = playOrder.concat(nextIndices);
	}

	function checkShuffleStateChange(currentShuffleState) {
		if (currentShuffleState != prevShuffleState) {
			// Drop any future indices from the play order when the shuffle state changes
			// and enqueue one playlist worth of indices according the new state.
			playOrder = _.first(playOrder, playOrderIter);
			enqueueIndices(currentShuffleState);
			prevShuffleState = currentShuffleState;
		}
	}

	return {
		getCurrentIndex: function() {
			return (playOrderIter >= 0) ? playOrder[playOrderIter] : null;
		},
		jumpToPrevTrack: function() {
			if(playlist && playOrderIter > 0) {
				--playOrderIter;
				track = playlist[this.getCurrentIndex()];
				this.publish('playing', track);
				return track;
			}
			return null;
		},
		jumpToNextTrack: function(repeat, shuffle) {
			if (playlist === null) {
				return null;
			}
			if (!playOrder) {
				initPlayOrder(shuffle);
			}
			++playOrderIter;
			checkShuffleStateChange(shuffle);

			// check if we have run to the end of the enqueued tracks
			if (playOrderIter >= playOrder.length) {
				if (repeat) { // start another round
					enqueueIndices(shuffle);
				} else { // we are done
					playOrderIter = -1;
					playlist = null;
					this.publish('playlistEnded');
					return null;
				}
			}

			var track = playlist[this.getCurrentIndex()];
			this.publish('playing', track);
			return track;
		},
		setPlaylist: function(pl, startIndex /*optional*/) {
			playlist = pl;
			playOrder = null;
			playOrderIter = -1;
			startFromIndex = startIndex || null;
		},
		publish: function(name, parameters) {
			$rootScope.$emit(name, parameters);
		},
		subscribe: function(name, listener) {
			$rootScope.$on(name, listener);
		}
	};
}]);
