// Minimal protobuf wire decoder for MEXC PushDataV3ApiWrapper messages.
// Only decodes the fields the price pipeline needs: channel(1), symbol(3),
// createTime(5), sendTime(6) and the publicAggreBookTicker oneof body(315)
// with bidPrice(1), bidQuantity(2), askPrice(3), askQuantity(4), version(5),
// lastOrderCreateTime(6).

const readVarint = (buf, pos) => {
	let result = 0n;
	let shift = 0n;
	let byte;
	do {
		byte = buf[pos.i];
		pos.i += 1;
		result |= BigInt(byte & 0x7f) << shift;
		shift += 7n;
	} while (byte & 0x80);
	return result;
};

const decodeFields = buf => {
	const fields = {};
	const pos = { i: 0 };
	while (pos.i < buf.length) {
		const tag = Number(readVarint(buf, pos));
		const field = tag >>> 3;
		const wireType = tag & 7;
		if (wireType === 0) {
			fields[field] = readVarint(buf, pos);
		} else if (wireType === 2) {
			const len = Number(readVarint(buf, pos));
			fields[field] = buf.slice(pos.i, pos.i + len);
			pos.i += len;
		} else if (wireType === 1) {
			pos.i += 8;
		} else if (wireType === 5) {
			pos.i += 4;
		} else {
			throw new Error(`unsupported protobuf wire type ${wireType}`);
		}
	}
	return fields;
};

const text = value => (value === undefined ? undefined : value.toString());
const numeric = value => (value === undefined ? undefined : Number(value));

const BOOK_TICKER_FIELD = 315;

exports.decodeAggreBookTicker = buffer => {
	const wrapper = decodeFields(buffer);
	const out = {
		channel: text(wrapper[1]),
		symbol: text(wrapper[3]),
		createTime: numeric(wrapper[5]),
		sendTime: numeric(wrapper[6]),
	};
	if (wrapper[BOOK_TICKER_FIELD]) {
		const body = decodeFields(wrapper[BOOK_TICKER_FIELD]);
		out.publicAggreBookTicker = {
			bidPrice: text(body[1]),
			bidQuantity: text(body[2]),
			askPrice: text(body[3]),
			askQuantity: text(body[4]),
			version: text(body[5]),
			lastOrderCreateTime: numeric(body[6]),
		};
	}
	return out;
};
